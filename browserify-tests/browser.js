require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function(element) {
  function logHTML(arr) {
    var div = document.createElement("div"),
        text = document.createTextNode(arr.join(""));

    div.appendChild(text);
    element.appendChild(div);
  }

  var Logger = {
    log: function() {
      var args = [].slice.call(arguments, 0);
      logHTML(args);
    }
  };

  ['debug', 'info', 'warn', 'error', 'fatal'].forEach(function(type) {
    Logger[type] = Logger.log;
  });

  return Logger;
};

},{}],2:[function(require,module,exports){
/*
 * adaptor
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Basestar = require("./basestar"),
    Utils = require("./utils"),
    _ = require("./utils/helpers");

function formatErrorMessage(name, message) {
  return ["Error in connection", "'" + name + "'", "- " + message].join(" ");
}

// Public: Creates a new Adaptor
//
// opts - hash of acceptable params
//   name - name of the Adaptor, used when printing to console
//   connection - Connection the adaptor will use to proxy commands/events
//
// Returns a new Adaptor
var Adaptor = module.exports = function Adaptor(opts) {
  opts = opts || {};

  this.name = opts.name;

  // the Robot the adaptor belongs to
  this.robot = opts.robot;

  // some default options
  this.host = opts.host;
  this.port = opts.port;

  // misc. details provided in args hash
  this.details = {};

  _.each(opts, function(opt, name) {
    if (!_.includes(["robot", "name", "adaptor", "events"], name)) {
      this.details[name] = opt;
    }
  }, this);
};

Utils.subclass(Adaptor, Basestar);

// Public: Basic #connect function. Must be overwritten by a descendent class
//
// Returns nothing, throws an error
Adaptor.prototype.connect = function() {
  var message = formatErrorMessage(
    this.name,
    "Adaptor#connect method must be overwritten by descendant classes."
  );

  throw new Error(message);
};

// Public: Basic #disconnect function. Must be overwritten by a descendent class
//
// Returns nothing, throws an error
Adaptor.prototype.disconnect = function() {
  var message = formatErrorMessage(
    this.name,
    "Adaptor#disconnect method must be overwritten by descendant classes."
  );

  throw new Error(message);
};

// Public: Expresses the Connection in JSON format
//
// Returns an Object containing Connection data
Adaptor.prototype.toJSON = function() {
  return {
    name: this.name,
    adaptor: this.constructor.name || this.name,
    details: this.details
  };
};

},{"./basestar":3,"./utils":19,"./utils/helpers":20}],3:[function(require,module,exports){
/*
 * basestar
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var EventEmitter = require("events").EventEmitter;

var Utils = require("./utils"),
    _ = require("./utils/helpers");

// Basestar is a base class to be used when writing external Cylon adaptors and
// drivers. It provides some useful base methods and functionality
//
// It also extends EventEmitter, so child classes are capable of emitting events
// for other parts of the system to handle.
var Basestar = module.exports = function Basestar() {
};

Utils.subclass(Basestar, EventEmitter);

// Public: Proxies calls from all methods in the object to a target object
//
// methods - array of methods to proxy
// target - object to proxy methods to
// source - object to proxy methods from
// force - whether or not to overwrite existing method definitions
//
// Returns the klass where the methods have been proxied
Basestar.prototype.proxyMethods = Utils.proxyFunctionsToObject;

// Public: Triggers a callback and emits an event with provided data
//
// event - name of event to be triggered
// callback - callback function to be triggered
// ...data - additional arguments to be passed to both event/callback
//
// Returns nothing
Basestar.prototype.respond = function(event, callback, err) {
  var args = Array.prototype.slice.call(arguments, 3);

  if (!!err) {
    this.emit("error", err);
  } else {
    this.emit.apply(this, [event].concat(args));
  }

  if (typeof callback === "function") {
    callback.apply(this, [err].concat(args));
  }
};

// Public: Defines an event handler that proxies events from a source object
// to a target object
//
// opts - object containing options:
//   - targetEventName or eventName - event that should be emitted from the
//                                    target
//   - target - object to proxy event to
//   - source - object to proxy event from
//   - sendUpdate - whether or not to send an "update" event
//
// Returns the source
Basestar.prototype.defineEvent = function(opts) {
  opts.sendUpdate = opts.sendUpdate || false;
  opts.targetEventName = opts.targetEventName || opts.eventName;

  opts.source.on(opts.eventName, function() {
    var args = arguments.length >= 1 ? [].slice.call(arguments, 0) : [];
    args.unshift(opts.targetEventName);
    opts.target.emit.apply(opts.target, args);

    if (opts.sendUpdate) {
      args.unshift("update");
      opts.target.emit.apply(opts.target, args);
    }
  });

  return opts.source;
};

// Public: Creates an event handler that proxies events from an adaptor"s
// "connector" (reference to whatever module is actually talking to the hw)
// to the adaptor
//
// opts - hash of opts to be passed to defineEvent()
//
// Returns this.connector
Basestar.prototype.defineAdaptorEvent = function(opts) {
  return this._proxyEvents(opts, this.connector, this);
};

// Public: Creates an event handler that proxies events from a driver"s
// connection to the driver
//
// opts - hash of opts to be passed to defineEvent()
//
// Returns this.connection
Basestar.prototype.defineDriverEvent = function(opts) {
  return this._proxyEvents(opts, this.connection, this);
};

Basestar.prototype._proxyEvents = function(opts, source, target) {
  opts = _.isString(opts) ? { eventName: opts } : opts;

  opts.source = source;
  opts.target = target;

  return this.defineEvent(opts);
};

},{"./utils":19,"./utils/helpers":20,"events":81}],4:[function(require,module,exports){
/*
 * Cylon - Internal Configuration
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

module.exports = {
  logging: {},

  // are we in TDR test mode? Used to stub out adaptors/drivers.
  testMode: false
};

},{}],5:[function(require,module,exports){
(function (process){
/*
 * cylon
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Async = require("async");

var Logger = require("./logger"),
    Robot = require("./robot"),
    Config = require("./config"),
    Utils = require("./utils"),
    _ = require("./utils/helpers");

var EventEmitter = require("events").EventEmitter;

var Cylon = module.exports = new EventEmitter();

Cylon.Logger = Logger;
Cylon.Driver = require("./driver");
Cylon.Adaptor = require("./adaptor");
Cylon.Utils = Utils;

Cylon.IO = {
  DigitalPin: require("./io/digital-pin"),
  Utils: require("./io/utils")
};

Cylon.apiInstances = [];

Cylon.robots = {};
Cylon.commands = {};

Cylon.events = [ "robot_added", "robot_removed" ];

// Public: Creates a new Robot
//
// opts - hash of Robot attributes
//
// Returns a shiny new Robot
// Examples:
//   Cylon.robot
//     connection: { name: "arduino", adaptor: "firmata" }
//     device: { name: "led", driver: "led", pin: 13 }
//
//     work: (me) ->
//       me.led.toggle()
Cylon.robot = function robot(opts) {
  opts = opts || {};

  // check if a robot with the same name exists already
  if (opts.name && this.robots[opts.name]) {
    var original = opts.name;
    opts.name = Utils.makeUnique(original, Object.keys(this.robots));

    var str = "Robot names must be unique. Renaming '";
    str += original + "' to '" + opts.name + "'";

    Logger.warn(str);
  }

  var bot = new Robot(opts);
  this.robots[bot.name] = bot;
  this.emit("robot_added", bot.name);

  return bot;
};

// Public: Initializes an API instance based on provided options.
//
// Returns nothing
Cylon.api = function api(Server, opts) {
  // if only passed options (or nothing), assume HTTP server
  if (Server == null || _.isObject(Server) && !_.isFunction(Server)) {
    opts = Server;
    Server = "http";
  }

  opts = opts || {};

  if (_.isString(Server)) {
    var req = "cylon-api-" + Server;

    try {
      Server = require(req);
    } catch (e) {
      if (e.code === "MODULE_NOT_FOUND") {
        var messages;

        if (req === "cylon-api-http") {
          messages = [
            "The HTTP API is no longer included in Cylon by default.",
            "To use it, install the plugin module: `npm install cylon-api-http`"
          ];
        } else {
          messages = [
            "Cannot find the " + req + " API module.",
            "You may be able to install it: `npm install " + req + "`"
          ];
        }

        _.each(messages, _.arity(Logger.fatal, 1));
        throw new Error("Missing API plugin - cannot proceed");
      } else {
        throw e;
      }
    }
  }

  opts.mcp = this;
  var instance = new Server(opts);
  this.apiInstances.push(instance);
  instance.start();
};

// Public: Starts up the API and the robots
//
// Returns nothing
Cylon.start = function start() {
  var starters = _.pluck(this.robots, "start");

  Async.parallel(starters, function() {
    var mode = Utils.fetch(Config, "workMode", "async");

    if (mode === "sync") {
      _.invoke(this.robots, "startWork");
    }
  }.bind(this));
};

// Public: Sets the internal configuration, based on passed options
//
// opts - object containing configuration key/value pairs
//
// Returns the current config
Cylon.config = function(opts) {
  var loggingChanged = (
    opts.logging && Config.logging !== _.extend(Config.logging, opts.logging)
  );

  if (_.isObject(opts)) {
    Config = _.extend(Config, opts);
  }

  if (loggingChanged) {
    Logger.setup();
  }

  return Config;
};

// Public: Halts the API and the robots
//
// callback - callback to be triggered when Cylon is ready to shutdown
//
// Returns nothing
Cylon.halt = function halt(callback) {
  callback = callback || function() {};

  var fns = _.pluck(this.robots, "halt");

  // if robots can"t shut down quickly enough, forcefully self-terminate
  var timeout = Config.haltTimeout || 3000;
  Utils.after(timeout, callback);

  Async.parallel(fns, callback);
};

Cylon.toJSON = function() {
  return {
    robots: _.invoke(this.robots, "toJSON"),
    commands: Object.keys(this.commands),
    events: this.events
  };
};

if (process.platform === "win32") {
  var readline = require("readline"),
      io = { input: process.stdin, output: process.stdout };

  readline.createInterface(io).on("SIGINT", function() {
    process.emit("SIGINT");
  });
}

process.on("SIGINT", function() {
  Cylon.halt(function() {
    process.kill(process.pid);
  });
});

}).call(this,require('_process'))
},{"./adaptor":2,"./config":4,"./driver":6,"./io/digital-pin":8,"./io/utils":9,"./logger":10,"./robot":14,"./utils":19,"./utils/helpers":20,"_process":84,"async":22,"events":81,"readline":72}],6:[function(require,module,exports){
/*
 * driver
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Basestar = require("./basestar"),
    Utils = require("./utils"),
    _ = require("./utils/helpers");

function formatErrorMessage(name, message) {
  return ["Error in driver", "'" + name + "'", "- " + message].join(" ");
}

// Public: Creates a new Driver
//
// opts - hash of acceptable params
//   name - name of the Driver, used when printing to console
//   device - Device the driver will use to proxy commands/events
//
// Returns a new Driver
var Driver = module.exports = function Driver(opts) {
  opts = opts || {};

  this.name = opts.name;
  this.robot = opts.robot;

  this.connection = opts.connection;

  this.commands = {};
  this.events = [];

  // some default options
  this.pin = opts.pin;
  this.interval = opts.interval || 10;

  this.details = {};

  _.each(opts, function(opt, name) {
    var banned = ["robot", "name", "connection", "driver", "events"];

    if (!_.includes(banned, name)) {
      this.details[name] = opt;
    }
  }, this);
};

Utils.subclass(Driver, Basestar);

// Public: Basic #start function. Must be overwritten by a descendent class
//
// Returns nothing, throws an error
Driver.prototype.start = function() {
  var message = formatErrorMessage(
    this.name,
    "Driver#start method must be overwritten by descendant classes."
  );

  throw new Error(message);
};

// Public: Basic #halt function. Must be overwritten by a descendent class
//
// Returns nothing, throws an error
Driver.prototype.halt = function() {
  var message = formatErrorMessage(
    this.name,
    "Driver#halt method must be overwritten by descendant classes."
  );

  throw new Error(message);
};

Driver.prototype.setupCommands = function(commands, proxy) {
  if (proxy == null) {
    proxy = this.connection;
  }

  Utils.proxyFunctionsToObject(commands, proxy, this);

  commands.forEach(function(command) {
    var snake_case = command.replace(/[A-Z]+/g, function(match) {
      if (match.length > 1) {
        match = match.replace(/[A-Z]$/, function(m) {
          return "_" + m.toLowerCase();
        });
      }

      return "_" + match.toLowerCase();
    }).replace(/^_/, "");

    this.commands[snake_case] = this[command];
  }, this);
};

Driver.prototype.toJSON = function() {
  return {
    name: this.name,
    driver: this.constructor.name || this.name,
    connection: this.connection.name,
    commands: Object.keys(this.commands),
    events: this.events,
    details: this.details
  };
};

},{"./basestar":3,"./utils":19,"./utils/helpers":20}],7:[function(require,module,exports){
(function (process){
/*
 * Device/Connection Initializer
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Registry = require("./registry"),
    Config = require("./config"),
    _ = require("./utils/helpers");

function testMode() {
  return process.env.NODE_ENV === "test" && Config.testMode;
}

module.exports = function Initializer(type, opts) {
  var mod;

  mod = Registry.findBy(type, opts[type]);

  if (!mod) {
    if (opts.module) {
      Registry.register(opts.module);
    } else {
      Registry.register("cylon-" + opts[type]);
    }

    mod = Registry.findBy(type, opts[type]);
  }

  var obj = mod[type](opts);

  _.each(obj, function(prop, name) {
    if (name === "constructor") {
      return;
    }

    if (_.isFunction(prop)) {
      obj[name] = prop.bind(obj);
    }
  });

  if (testMode()) {
    var test = Registry.findBy(type, "test")[type](opts);

    _.each(obj, function(prop, name) {
      if (_.isFunction(prop) && !test[name]) {
        test[name] = function() { return true; };
      }
    });

    return test;
  }

  return obj;
};

}).call(this,require('_process'))
},{"./config":4,"./registry":13,"./utils/helpers":20,"_process":84}],8:[function(require,module,exports){
/*
 * Linux IO DigitalPin
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var FS = require("fs"),
    EventEmitter = require("events").EventEmitter;

var Utils = require("../utils");

var GPIO_PATH = "/sys/class/gpio";

var GPIO_READ = "in";
var GPIO_WRITE = "out";

// DigitalPin class offers an interface with the Linux GPIO system present in
// single-board computers such as a Raspberry Pi, or a BeagleBone
var DigitalPin = module.exports = function DigitalPin(opts) {
  this.pinNum = opts.pin.toString();
  this.status = "low";
  this.ready = false;
  this.mode = opts.mode;
};

Utils.subclass(DigitalPin, EventEmitter);

DigitalPin.prototype.connect = function(mode) {
  if (this.mode == null) {
    this.mode = mode;
  }

  FS.exists(this._pinPath(), function(exists) {
    if (exists) {
      this._openPin();
    } else {
      this._createGPIOPin();
    }
  }.bind(this));
};

DigitalPin.prototype.close = function() {
  FS.writeFile(this._unexportPath(), this.pinNum, function(err) {
    this._closeCallback(err);
  }.bind(this));
};

DigitalPin.prototype.closeSync = function() {
  FS.writeFileSync(this._unexportPath(), this.pinNum);
  this._closeCallback(false);
};

DigitalPin.prototype.digitalWrite = function(value) {
  if (this.mode !== "w") {
    this._setMode("w");
  }

  this.status = value === 1 ? "high" : "low";

  FS.writeFile(this._valuePath(), value, function(err) {
    if (err) {
      var str = "Error occurred while writing value ";
      str += value + " to pin " + this.pinNum;

      this.emit("error", str);
    } else {
      this.emit("digitalWrite", value);
    }
  }.bind(this));

  return value;
};

// Public: Reads the digial pin"s value periodicly on a supplied interval,
// and emits the result or an error
//
// interval - time (in milliseconds) to read from the pin at
//
// Returns the defined interval
DigitalPin.prototype.digitalRead = function(interval) {
  if (this.mode !== "r") { this._setMode("r"); }

  Utils.every(interval, function() {
    FS.readFile(this._valuePath(), function(err, data) {
      if (err) {
        var error = "Error occurred while reading from pin " + this.pinNum;
        this.emit("error", error);
      } else {
        var readData = parseInt(data.toString());
        this.emit("digitalRead", readData);
      }
    }.bind(this));
  }.bind(this));
};

DigitalPin.prototype.setHigh = function() {
  return this.digitalWrite(1);
};

DigitalPin.prototype.setLow = function() {
  return this.digitalWrite(0);
};

DigitalPin.prototype.toggle = function() {
  return (this.status === "low") ? this.setHigh() : this.setLow();
};

// Creates the GPIO file to read/write from
DigitalPin.prototype._createGPIOPin = function() {
  FS.writeFile(this._exportPath(), this.pinNum, function(err) {
    if (err) {
      this.emit("error", "Error while creating pin files");
    } else {
      this._openPin();
    }
  }.bind(this));
};

DigitalPin.prototype._openPin = function() {
  this._setMode(this.mode, true);
  this.emit("open");
};

DigitalPin.prototype._closeCallback = function(err) {
  if (err) {
    this.emit("error", "Error while closing pin files");
  } else {
    this.emit("close", this.pinNum);
  }
};

// Sets the mode for the pin by writing the values to the pin reference files
DigitalPin.prototype._setMode = function(mode, emitConnect) {
  if (emitConnect == null) { emitConnect = false; }

  this.mode = mode;

  var data = (mode === "w") ? GPIO_WRITE : GPIO_READ;

  FS.writeFile(this._directionPath(), data, function(err) {
    this._setModeCallback(err, emitConnect);
  }.bind(this));
};

DigitalPin.prototype._setModeCallback = function(err, emitConnect) {
  if (err) {
    return this.emit("error", "Setting up pin direction failed");
  }

  this.ready = true;

  if (emitConnect) {
    this.emit("connect", this.mode);
  }
};

DigitalPin.prototype._directionPath = function() {
  return this._pinPath() + "/direction";
};

DigitalPin.prototype._valuePath = function() {
  return this._pinPath() + "/value";
};

DigitalPin.prototype._pinPath = function() {
  return GPIO_PATH + "/gpio" + this.pinNum;
};

DigitalPin.prototype._exportPath = function() {
  return GPIO_PATH + "/export";
};

DigitalPin.prototype._unexportPath = function() {
  return GPIO_PATH + "/unexport";
};

},{"../utils":19,"events":81,"fs":72}],9:[function(require,module,exports){
"use strict";

module.exports = {
  // Returns { period: int, duty: int }
  // Calculated based on params value, freq, pulseWidth = { min: int, max: int }
  // pulseWidth min and max need to be specified in microseconds
  periodAndDuty: function(scaledDuty, freq, pulseWidth, polarity) {
    var period, duty, maxDuty;

    polarity = polarity || "high";
    period = Math.round(1.0e9 / freq);

    if (pulseWidth != null) {
      var pulseWidthMin = pulseWidth.min * 1000,
          pulseWidthMax = pulseWidth.max * 1000;

      maxDuty =  pulseWidthMax - pulseWidthMin;
      duty = Math.round(pulseWidthMin + (maxDuty * scaledDuty));
    } else {
      duty = Math.round(period * scaledDuty);
    }

    if (polarity === "low") {
      duty = period - duty;
    }

    return { period: period, duty: duty };
  }
};

},{}],10:[function(require,module,exports){
(function (process){
/*
 * logger
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var levels = ["debug", "info", "warn", "error", "fatal"];

var BasicLogger = require("./logger/basic_logger"),
    NullLogger = require("./logger/null_logger"),
    Config = require("./config"),
    _ = require("./utils/helpers");

var Logger = module.exports = {
  setup: function(opts) {
    if (_.isObject(opts)) {
      Config.logging = _.extend(Config.logging, opts);
    }

    var logger = Config.logging.logger,
        level  = Config.logging.level || "info";

    // --debug CLI flag overrides any other option
    if (_.includes(process.argv, "--debug")) {
      level = "debug";
    }

    logger = (logger == null) ? BasicLogger : logger;

    this.logger = logger || NullLogger;
    this.level = level;

    return this;
  },

  toString: function() {
    return this.logger.toString();
  }
};

Logger.setup();

levels.forEach(function(level) {
  Logger[level] = function() {
    if (levels.indexOf(level) >= levels.indexOf(Logger.level)) {
      return Logger.logger[level].apply(Logger.logger, arguments);
    }
  };
});

}).call(this,require('_process'))
},{"./config":4,"./logger/basic_logger":11,"./logger/null_logger":12,"./utils/helpers":20,"_process":84}],11:[function(require,module,exports){
"use strict";

var getArgs = function(args) {
  return args.length >= 1 ? [].slice.call(args, 0) : [];
};

var logString = function(type) {
  var time = new Date().toISOString(),
      upcase = String(type).toUpperCase(),
      padded = String("      " + upcase).slice(-5);

  return upcase[0] + ", [" + time + "] " + padded + " -- :";
};

// The BasicLogger logs to console.log
var BasicLogger = module.exports = {
  toString: function() { return "BasicLogger"; },
};

["debug", "info", "warn", "error", "fatal"].forEach(function(type) {
  BasicLogger[type] = function() {
    var args = getArgs(arguments);
    return console.log.apply(console, [].concat(logString(type), args));
  };
});

},{}],12:[function(require,module,exports){
"use strict";

// The NullLogger is designed for cases where you want absolutely nothing to
// print to anywhere. Every proxied method from the Logger returns a noop.
var NullLogger = module.exports = {
  toString: function() { return "NullLogger"; }
};

["debug", "info", "warn", "error", "fatal"].forEach(function(type) {
  NullLogger[type] = function() {};
});

},{}],13:[function(require,module,exports){
(function (process){
/*
 * Registry
 *
 * The Registry contains references to all Drivers and Adaptors Cylon is aware
 * of, along with which module they live in (e.g. cylon-firmata).
 *
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Logger = require("./logger"),
    _ = require("./utils/helpers");

// Explicitly these modules here, so Browserify can grab them later
require("./test/loopback");
require("./test/test-adaptor");
require("./test/test-driver");
require("./test/ping");

var missingModuleError = function(module) {
  var str = "Cannot find the '" + module + "' module.\n";
  str += "This problem might be fixed by installing it with ";
  str +="'npm install " + module + "' and trying again.";

  console.log(str);

  process.emit("SIGINT");
};

var Registry = module.exports = {
  data: {},

  register: function(module) {
    if (this.data[module]) {
      return this.data[module].module;
    }

    var pkg;

    try {
      pkg = require(module);
    } catch (e) {
      if (e.code === "MODULE_NOT_FOUND") {
        missingModuleError(module);
      }

      throw e;
    }

    this.data[module] = {
      module: pkg,
      adaptors: pkg.adaptors || [],
      drivers: pkg.drivers || [],
      dependencies: pkg.dependencies || []
    };

    this.logRegistration(module, this.data[module]);

    this.data[module].dependencies.forEach(function(dep) {
      Registry.register(dep);
    });

    return this.data[module].module;
  },

  findBy: function(prop, name) {
    // pluralize, if necessary
    if (prop.slice(-1) !== "s") {
      prop += "s";
    }

    return this.search(prop, name);
  },

  findByModule: function(module) {
    if (!this.data[module]) {
      return null;
    }

    return this.data[module].module;
  },

  logRegistration: function(name) {
    var module = this.data[name];

    Logger.debug("Registering module " + name);

    ["adaptors", "drivers", "dependencies"].forEach(function(field) {
      if (module[field].length) {
        Logger.debug("  " + field + ":");
        module[field].forEach(function(item) {
          Logger.debug("    - " + item);
        });
      }
    });
  },

  search: function(entry, value) {
    for (var name in this.data) {
      var repo = this.data[name];

      if (repo[entry] && _.includes(repo[entry], value)) {
        return repo.module;
      }
    }

    return false;
  }
};

// Default drivers/adaptors:
["loopback", "ping", "test-adaptor", "test-driver"].forEach(function(module) {
  Registry.register("./test/" + module);
});

}).call(this,require('_process'))
},{"./logger":10,"./test/loopback":15,"./test/ping":16,"./test/test-adaptor":17,"./test/test-driver":18,"./utils/helpers":20,"_process":84}],14:[function(require,module,exports){
(function (process){
/*
 * robot
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var initializer = require("./initializer"),
    Logger = require("./logger"),
    Utils = require("./utils"),
    Config = require("./config"),
    _ = require("./utils/helpers");

var Async = require("async"),
    EventEmitter = require("events").EventEmitter;

// Public: Creates a new Robot
//
// opts - object containing Robot options
//   name - optional, string name of the robot
//   connection/connections - object connections to connect to
//   device/devices - object devices to connect to
//   work - work to be performed when the Robot is started
//
// Returns a new Robot
var Robot = module.exports = function Robot(opts) {
  opts = opts || {};

  var methods = [
    "toString",
    "halt",
    "startDevices",
    "startConnections",
    "start",
    "initRobot",
    "initDevices",
    "initConnections",
    "log"
  ];

  methods.forEach(function(method) {
    this[method] = this[method].bind(this);
  }, this);

  this.initRobot(opts);

  this.checkForBadSyntax(opts);

  this.initConnections(opts);
  this.initDevices(opts);

  _.each(opts, function(opt, name) {
    if (this[name] !== undefined) {
      return;
    }

    if (_.isFunction(opt)) {
      this[name] = opt.bind(this);

      if (opts.commands == null) {
        this.commands[name] = opt.bind(this);
      }
    } else {
      this[name] = opt;
    }
  }, this);

  if (opts.commands) {
    var cmds;

    if (_.isFunction(opts.commands)) {
      cmds = opts.commands.call(this);
    } else {
      cmds = opts.commands;
    }

    if (_.isObject(cmds)) {
      this.commands = cmds;
    } else {
      var err = "#commands must be an object ";
      err += "or a function that returns an object";
      throw new Error(err);
    }
  }

  var mode = Utils.fetch(Config, "mode", "manual");

  if (mode === "auto") {
    // run on the next tick, to allow for "work" event handlers to be set up
    setTimeout(this.start, 0);
  }
};

Utils.subclass(Robot, EventEmitter);

// Public: Generates a random name for a Robot.
//
// Returns a string name
Robot.randomName = function() {
  return "Robot " + (Math.floor(Math.random() * 100000));
};

// Public: Expresses the Robot in a JSON-serializable format
//
// Returns an Object containing Robot data
Robot.prototype.toJSON = function() {
  return {
    name: this.name,
    connections: _.invoke(this.connections, "toJSON"),
    devices: _.invoke(this.devices, "toJSON"),
    commands: Object.keys(this.commands),
    events: _.isArray(this.events) ? this.events : []
  };
};

Robot.prototype.connection = function(name, conn) {
  conn.robot = this;
  conn.name = name;

  if (this.connections[conn.name]) {
    var original = conn.name,
        str;

    conn.name = Utils.makeUnique(original, Object.keys(this.connections));

    str = "Connection names must be unique.";
    str += "Renaming '" + original + "' to '" + conn.name + "'";
    this.log("warn", str);
  }

  this.connections[conn.name] = initializer("adaptor", conn);

  return this;
};

// Public: Initializes all vars for robot
//
// opts - options array passed to constructor
//
// Returns null
Robot.prototype.initRobot = function(opts) {
  this.name = opts.name || Robot.randomName();
  this.connections = {};
  this.devices = {};
  this.adaptors = {};
  this.drivers = {};
  this.commands = {};
  this.running = false;
  this.work = opts.work || opts.play;

  if (!this.work) {
    this.work = function() { this.log("debug", "No work yet."); };
  }
};

// Public: Checks options for bad Cylon syntax
//
// Returns nothing
Robot.prototype.checkForBadSyntax = function(opts) {
  var self = this;

  var RobotDSLError = new Error("Unable to start robot due to a syntax error");
  RobotDSLError.name = "RobotDSLError";

  function has(prop) { return opts[prop] != null; }

  function checkForSingleObjectSyntax(type) {
    var plural = type + "s";

    if (has(type) && !has(plural)) {
      [
        "The single-object '" + type + "' syntax for robots is not valid.",
        "Instead, use the multiple-value '" + plural + "' key syntax.",
        "Details: http://cylonjs.com/documentation/guides/working-with-robots/"
      ].forEach(function(str) { self.log("fatal", str); });

      throw RobotDSLError;
    }
  }

  ["connection", "device"].forEach(checkForSingleObjectSyntax);
};

// Public: Initializes all connections for the robot
//
// opts - options array passed to constructor
//
// Returns initialized connections
Robot.prototype.initConnections = function(opts) {
  this.log("info", "Initializing connections.");

  if (opts.connections == null) {
    return this.connections;
  }

  _.each(opts.connections, function(conn, key) {
    var name = _.isString(key) ? key : conn.name;

    if (conn.devices) {
      opts.devices = opts.devices || {};

      _.each(conn.devices, function(device, d) {
        device.connection = name;
        opts.devices[d] = device;
      });

      delete conn.devices;
    }

    this.connection(name, conn);
  }, this);

  return this.connections;
};

Robot.prototype.device = function(name, device) {
  var str;

  device.robot = this;
  device.name = name;

  if (this.devices[device.name]) {
    var original = device.name;
    device.name = Utils.makeUnique(original, Object.keys(this.devices));

    str = "Device names must be unique.";
    str += "Renaming '" + original + "' to '" + device.name + "'";
    this.log("warn", str);
  }

  if (_.isString(device.connection)) {
    if (this.connections[device.connection] == null) {
      str = "No connection found with the name " + device.connection + ".\n";
      this.log("fatal", str);
      process.emit("SIGINT");
    }

    device.connection = this.connections[device.connection];
  } else {
    for (var c in this.connections) {
      device.connection = this.connections[c];
      break;
    }
  }

  this.devices[device.name] = initializer("driver", device);

  return this;
};

// Public: Initializes all devices for the robot
//
// opts - options array passed to constructor
//
// Returns initialized devices
Robot.prototype.initDevices = function(opts) {
  this.log("info", "Initializing devices.");

  if (opts.devices == null) {
    return this.devices;
  }

  // check that there are connections to use
  if (!Object.keys(this.connections).length) {
    throw new Error("No connections specified");
  }

  _.each(opts.devices, function(device, key) {
    var name = _.isString(key) ? key : device.name;
    this.device(name, device);
  }, this);

  return this.devices;
};

// Public: Starts the Robot working.
//
// Starts the connections, devices, and work.
//
// Returns the result of the work
Robot.prototype.start = function(callback) {
  if (this.running) {
    return this;
  }

  var mode = Utils.fetch(Config, "workMode", "async");

  var start = function() {
    if (mode === "async") {
      this.startWork();
    }
  }.bind(this);

  Async.series([
    this.startConnections,
    this.startDevices,
    start
  ], function(err, results) {
    if (!!err) {
      this.log("fatal", "An error occured while trying to start the robot:");
      this.log("fatal", err);

      this.halt(function() {
        if (_.isFunction(this.error)) {
          this.error.call(this, err);
        }

        if (this.listeners("error").length) {
          this.emit("error", err);
        }
      }.bind(this));
    }

    if (_.isFunction(callback)) {
      callback(err, results);
    }
  }.bind(this));

  return this;
};

// Public: Starts the Robot"s work and triggers a callback
//
// callback - callback function to be triggered
//
// Returns nothing
Robot.prototype.startWork = function() {
  this.log("info", "Working.");

  this.emit("ready", this);
  this.work.call(this, this);
  this.running = true;
};

// Public: Starts the Robot"s connections and triggers a callback
//
// callback - callback function to be triggered
//
// Returns nothing
Robot.prototype.startConnections = function(callback) {
  this.log("info", "Starting connections.");

  var starters = _.map(this.connections, function(conn, name) {
    this[name] = conn;

    return function(cb) {
      var str = "Starting connection '" + name + "'";

      if (conn.host) {
        str += " on host " + conn.host;
      } else if (conn.port) {
        str += " on port " + conn.port;
      }

      this.log("debug", str + ".");
      return conn.connect.call(conn, cb);
    }.bind(this);
  }, this);

  return Async.parallel(starters, callback);
};

// Public: Starts the Robot"s devices and triggers a callback
//
// callback - callback function to be triggered
//
// Returns nothing
Robot.prototype.startDevices = function(callback) {
  var log = this.log;

  log("info", "Starting devices.");

  var starters = _.map(this.devices, function(device, name) {
    this[name] = device;

    return function(cb) {
      var str = "Starting device '" + name + "'";

      if (device.pin) {
        str += " on pin " + device.pin;
      }

      log("debug", str + ".");
      return device.start.call(device, cb);
    };
  }, this);

  return Async.parallel(starters, callback);
};

// Public: Halts the Robot.
//
// Halts the devices, disconnects the connections.
//
// callback - callback to be triggered when the Robot is stopped
//
// Returns nothing
Robot.prototype.halt = function(callback) {
  callback = callback || function() {};

  if (!this.isRunning) {
    return callback();
  }

  var devices = _.pluck(this.devices, "halt"),
      connections = _.pluck(this.connections, "disconnect");

  try {
    Async.parallel(devices, function() {
      Async.parallel(connections, callback);
    });
  } catch (e) {
    var msg = "An error occured while attempting to safely halt the robot";
    this.log("error", msg);
    this.log("error", e.message);
  }

  this.running = false;
};

// Public: Returns basic info about the robot as a String
//
// Returns a String
Robot.prototype.toString = function() {
  return "[Robot name='" + this.name + "']";
};

Robot.prototype.log = function(level) {
  var args = Array.prototype.slice.call(arguments, 1);
  args.unshift("[" + this.name + "] -");
  Logger[level].apply(null, args);
};

}).call(this,require('_process'))
},{"./config":4,"./initializer":7,"./logger":10,"./utils":19,"./utils/helpers":20,"_process":84,"async":22,"events":81}],15:[function(require,module,exports){
/*
 * Loopback adaptor
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Adaptor = require("../adaptor"),
    Utils = require("../utils");

var Loopback;

module.exports = Loopback = function Loopback() {
  Loopback.__super__.constructor.apply(this, arguments);
};

Utils.subclass(Loopback, Adaptor);

Loopback.prototype.connect = function(callback) {
  callback();
};

Loopback.prototype.disconnect = function(callback) {
  callback();
};

Loopback.adaptors = ["loopback"];
Loopback.adaptor = function(opts) { return new Loopback(opts); };

},{"../adaptor":2,"../utils":19}],16:[function(require,module,exports){
/*
 * Ping driver
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Driver = require("../driver"),
    Utils = require("../utils");

var Ping = module.exports = function Ping() {
  Ping.__super__.constructor.apply(this, arguments);

  this.commands = {
    ping: this.ping
  };

  this.events = ["ping"];
};

Utils.subclass(Ping, Driver);

Ping.prototype.ping = function() {
  this.emit("ping", "ping");
  return "pong";
};

Ping.prototype.start = function(callback) {
  callback();
};

Ping.prototype.halt = function(callback) {
  callback();
};

Ping.drivers = ["ping"];
Ping.driver = function(opts) { return new Ping(opts); };

},{"../driver":6,"../utils":19}],17:[function(require,module,exports){
/*
 * Test adaptor
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Adaptor = require("../adaptor"),
    Utils = require("../utils");

var TestAdaptor;

module.exports = TestAdaptor = function TestAdaptor() {
  TestAdaptor.__super__.constructor.apply(this, arguments);
};

Utils.subclass(TestAdaptor, Adaptor);

TestAdaptor.adaptors = ["test"];
TestAdaptor.adaptor = function(opts) { return new TestAdaptor(opts); };

},{"../adaptor":2,"../utils":19}],18:[function(require,module,exports){
/*
 * Test driver
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Driver = require("../driver"),
    Utils = require("../utils");

var TestDriver;

module.exports = TestDriver = function TestDriver() {
  TestDriver.__super__.constructor.apply(this, arguments);
};

Utils.subclass(TestDriver, Driver);

TestDriver.drivers = ["test"];
TestDriver.driver = function(opts) { return new TestDriver(opts); };

},{"../driver":6,"../utils":19}],19:[function(require,module,exports){
(function (global){
/*
 * Cylon - Utils
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var _ = require("./utils/helpers");

var monkeyPatches = require("./utils/monkey-patches");

var Utils = module.exports = {
  // Public: Alias to setInterval, combined with Number monkeypatches below to
  // create an artoo-like syntax.
  //
  // interval - interval to run action on
  // action - action to perform at interval
  //
  // Examples
  //
  //   every((5).seconds(), function() {
  //     console.log("Hello world (and again in 5 seconds)!");
  //   });
  //
  // Returns an interval
  every: function every(interval, action) {
    return setInterval(action, interval);
  },

  // Public: Alias to setTimeout, combined with Number monkeypatches below to
  // create an artoo-like syntax.
  //
  // interval - interval to run action on
  // action - action to perform at interval
  //
  // Examples
  //
  //   after((10).seconds(), function() {
  //     console.log("Hello world from ten seconds ago!");
  //   });
  //
  // Returns an interval
  after: function after(delay, action) {
    return setTimeout(action, delay);
  },

  // Public: Alias to the `every` function, but passing 0
  // Examples
  //
  //   constantly(function() {
  //     console.log("hello world (and again and again)!");
  //   });
  //
  // Returns an interval
  constantly: function constantly(action) {
    return every(0, action);
  },

  // Public: Sleep - do nothing for some duration of time.
  //
  // ms - number of ms to sleep for
  //
  // Examples
  //
  //   sleep((1).second());
  //
  // Returns a function
  sleep: function sleep(ms) {
    var start = Date.now(),
        i;

    while(Date.now() < start + ms) {
      i = 0;
    }
  },

  // Public: Function to use for class inheritance.
  // Based on CoffeeScript's implementation.
  //
  // Example
  //
  //    var Sphero = function Sphero() {};
  //
  //    subclass(Sphero, ParentClass);
  //
  //    // Sphero is now a subclass of Parent, and can access parent methods
  //    // through Sphero.__super__
  //
  // Returns subclass
  subclass: function subclass(child, parent) {
    var Ctor = function() {
      this.constructor = child;
    };

    for (var key in parent) {
      if (parent.hasOwnProperty(key)) {
        child[key] = parent[key];
      }
    }

    Ctor.prototype = parent.prototype;
    child.prototype = new Ctor();
    child.__super__ = parent.prototype;
    return child;
  },

  proxyFunctions: function proxyFunctions(source, target) {
    _.each(source, function(prop, key) {
      if (_.isFunction(prop) && !target[key]) {
        target[key] = prop.bind(source);
      }
    });
  },

  // Public: Proxies a list of methods from one object to another. It will not
  // overwrite existing methods unless told to.
  //
  // methods - array of functions to proxy
  // target  - object to proxy the functions to
  // base    - (optional) object that proxied functions will be declared on.
  //           Defaults to 'this'.
  // force   - (optional) boolean - whether or not to force method assignment
  //
  // Returns base
  proxyFunctionsToObject: function(methods, target, base, force) {
    if (base == null) {
      base = this;
    }

    force = force || false;

    methods.forEach(function(method) {
      if (_.isFunction(base[method]) && !force) {
        return;
      }

      base[method] = function() {
        return target[method].apply(target, arguments);
      };
    });

    return base;
  },

  // Public: Analogue to Ruby"s Hash#fetch method for looking up object
  // properties.
  //
  // obj - object to do property lookup on
  // property - string property name to attempt to look up
  // fallback - either:
  //    - a fallback value to return if `property` can"t be found
  //    - a function to be executed if `property` can"t be found. The function
  //    will be passed `property` as an argument.
  //
  //  Examples
  //
  //    var object = { property: "hello world" };
  //    fetch(object, "property");
  //    //=> "hello world"
  //
  //    fetch(object, "notaproperty", "default value");
  //    //=> "default value"
  //
  //    var notFound = function(prop) { return prop + " not found!" };
  //    fetch(object, "notaproperty", notFound)
  //    // "notaproperty not found!"
  //
  //    var badFallback = function(prop) { prop + " not found!" };
  //    fetch(object, "notaproperty", badFallback)
  //    // Error: no return value from provided callback function
  //
  //    fetch(object, "notaproperty");
  //    // Error: key not found: "notaproperty"
  //
  // Returns the value of obj[property], a fallback value, or the results of
  // running "fallback". If the property isn"t found, and "fallback" hasn"t been
  // provided, will throw an error.
  fetch: function(obj, property, fallback) {
    if (obj.hasOwnProperty(property)) {
      return obj[property];
    }

    if (fallback === void 0) {
      throw new Error("key not found: \"" + property + "\"");
    }

    if (_.isFunction(fallback)) {
      var value = fallback(property);

      if (value === void 0) {
        throw new Error("no return value from provided fallback function");
      }

      return value;
    }

    return fallback;
  },

  // Public: Given a name, and an array of existing names, returns a unique
  // name.
  //
  // name - name that"s colliding with existing names
  // arr - array of existing names
  //
  // Returns the new name as a string
  makeUnique: function(name, arr) {
    var newName;

    if (!~arr.indexOf(name)) {
      return name;
    }

    for (var n = 1; ; n++) {
      newName = name + "-" + n;
      if (!~arr.indexOf(newName)) {
        return newName;
      }
    }
  },

  // Public: Adds necessary utils to global namespace, along with base class
  // extensions.
  //
  // Examples
  //
  //    Number.prototype.seconds // undefined
  //    after                    // undefined
  //
  //    Utils.bootstrap();
  //
  //    Number.prototype.seconds // [function]
  //    (after === Utils.after)  // true
  //
  // Returns Cylon.Utils
  bootstrap: function bootstrap() {
    global.every = this.every;
    global.after = this.after;
    global.constantly = this.constantly;

    monkeyPatches.install();

    return this;
  }
};

Utils.bootstrap();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./utils/helpers":20,"./utils/monkey-patches":21}],20:[function(require,module,exports){
// A collection of useful helper functions, used internally but not exported
// with the rest of Cylon.
"use strict";

var __slice = Array.prototype.slice;

var H = module.exports = {};

function identity(value) {
  return value;
}

function extend(base, source) {
  var isArray = Array.isArray(source);

  if (base == null) {
    base = isArray ? [] : {};
  }

  if (isArray) {
    source.forEach(function(e, i) {
      if (typeof base[i] === "undefined") {
        base[i] = e;
      } else if (typeof e === "object") {
        base[i] = extend(base[i], e);
      } else {
        if (!~base.indexOf(e)) {
          base.push(e);
        }
      }
    });
  } else {
    var key;

    for (key in source) {
      if (typeof source[key] !== "object" || !source[key]) {
        base[key] = source[key];
      } else {
        if (base[key]) {
          extend(base[key], source[key]);
        } else {
          base[key] = source[key];
        }
      }
    }
  }

  return base;
}

extend(H, {
  identity: identity,
  extend: extend
});

function kind(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}

function isA(type) {
  return function(thing) {
    return kind(thing) === type;
  };
}

extend(H, {
  isObject:      isA("Object"),
  isObjectLoose: function(thing) { return typeof thing === "object"; },
  isFunction:    isA("Function"),
  isArray:       isA("Array"),
  isString:      isA("String"),
  isNumber:      isA("Number"),
  isArguments:   isA("Arguments"),
  isUndefined:   isA("Undefined")
});

function iterate(thing, fn, thisVal) {
  if (H.isArray(thing)) {
    thing.forEach(fn, thisVal);
    return;
  }

  if (H.isObject(thing)) {
    for (var key in thing) {
      var value = thing[key];
      fn.call(thisVal, value, key);
    }
  }

  return [];
}

function pluck(collection, key) {
  var keys = [];

  iterate(collection, function(object) {
    if (H.isObject(object)) {
      if (H.isFunction(object[key])) {
        keys.push(object[key].bind(object));
      } else {
        keys.push(object[key]);
      }
    }
  });

  return keys;
}

function map(collection, fn, thisVal) {
  var vals = [];

  if (fn == null) {
    fn = identity;
  }

  iterate(collection, function(object, index) {
    vals.push(fn.call(thisVal, object, index));
  });

  return vals;
}

function invoke(collection, fn) {
  var args = __slice.call(arguments, 2),
      vals = [];

  iterate(collection, function(object) {
    if (H.isFunction(fn)) {
      vals.push(fn.apply(object, args));
      return;
    }

    vals.push(object[fn].apply(object, arguments));
  });

  return vals;
}

function reduce(collection, iteratee, accumulator, thisVal) {
  var isArray = H.isArray(collection);

  if (!isArray && !H.isObjectLoose(collection)) {
    return null;
  }

  if (iteratee == null) {
    iteratee = identity;
  }

  if (accumulator == null) {
    if (isArray) {
      accumulator = collection.shift();
    } else {
      for (var key in collection) {
        accumulator = collection[key];
        delete collection[key];
        break;
      }
    }
  }

  iterate(collection, function(object, key) {
    accumulator = iteratee.call(thisVal, accumulator, object, key);
  });

  return accumulator;
}

extend(H, {
  pluck: pluck,
  each: iterate,
  map: map,
  invoke: invoke,
  reduce: reduce
});

function arity(fn, n) {
  return function() {
    var args = __slice.call(arguments, 0, n);
    return fn.apply(null, args);
  };
}

function partial(fn) {
  var args = __slice.call(arguments, 1);

  return function() {
    return fn.apply(null, args.concat(__slice.call(arguments)));
  };
}

function partialRight(fn) {
  var args = __slice.call(arguments, 1);

  return function() {
    return fn.apply(null, __slice.call(arguments).concat(args));
  };
}

extend(H, {
  arity: arity,
  partial: partial,
  partialRight: partialRight
});

function includes(arr, value) {
  return !!~arr.indexOf(value);
}

extend(H, {
  includes: includes
});

},{}],21:[function(require,module,exports){
"use strict";

var max = Math.max,
    min = Math.min;

module.exports.install = function() {
  // Public: Monkey-patches Number to have Rails-like //seconds() function.
  // Warning, due to the way the Javascript parser works, applying functions on
  // numbers is kind of weird. See examples for details.
  //
  // Examples
  //
  //   2.seconds()
  //   //=> SyntaxError: Unexpected token ILLEGAL
  //
  //   10..seconds()
  //   //=> 10000
  //
  //   (5).seconds()
  //   //=> 5000
  //   // This is the preferred way to represent numbers when calling these
  //   // methods on them
  //
  // Returns an integer representing time in milliseconds

  /**
   * Multiplies a number by 1000 to get time in milliseconds
   *
   * @example
   * (2).seconds(); //=> 2000
   * @return {Number} time in milliseconds
   */
  Number.prototype.seconds = function() {
    return this * 1000;
  };

  /**
   * Alias for Number.prototype.seconds
   *
   * @see Number.prototype.seconds
   * @example
   * (1).second(); //=> 1000
   * @return {Number} time in milliseconds
   */
  Number.prototype.second = Number.prototype.seconds;

  /**
   * Converts a number from a current scale to a 0 - 1 scale.
   *
   * @param {Number} start low point of scale to convert from
   * @param {Number} end high point of scale to convert from
   * @example
   * (5).fromScale(0, 10) //=> 0.5
   * @return {Number} the scaled value
   */
  Number.prototype.fromScale = function(start, end) {
    var val = (this - min(start, end)) / (max(start, end) - min(start, end));

    if (val > 1) {
      return 1;
    }

    if (val < 0){
      return 0;
    }

    return val;
  };

  /**
   * Converts a number from a 0 - 1 scale to the specified scale.
   *
   * @param {Number} start low point of scale to convert to
   * @param {Number} end high point of scale to convert to
   * @example
   * (0.5).toScale(0, 10) //=> 5
   * @return {Number} the scaled value
   */
  Number.prototype.toScale = function(start, end) {
    var i = this * (max(start, end) - min(start, end)) + min(start, end);

    if (i < start) {
      return start;
    }

    if (i > end) {
      return end;
    }

    return i;
  };
};

},{}],22:[function(require,module,exports){
(function (process){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
          if (err) {
              callback(err);
              callback = function () {};
          }
          else {
              completed += 1;
              if (completed >= arr.length) {
                  callback();
              }
          }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        if (!callback) {
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err) {
                    callback(err);
                });
            });
        } else {
            var results = [];
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err, v) {
                    results[x.index] = v;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        var remainingTasks = keys.length
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () {};

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        }
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!_isArray(tasks)) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            kill: function () {
              q.drain = null;
              q.tasks = [];
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
                q.process();
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                q.process();
            }
        };
        return q;
    };

    async.priorityQueue = function (worker, concurrency) {

        function _compareTasks(a, b){
          return a.priority - b.priority;
        };

        function _binarySearch(sequence, item, compare) {
          var beg = -1,
              end = sequence.length - 1;
          while (beg < end) {
            var mid = beg + ((end - beg + 1) >>> 1);
            if (compare(item, sequence[mid]) >= 0) {
              beg = mid;
            } else {
              end = mid - 1;
            }
          }
          return beg;
        }

        function _insert(q, data, priority, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  priority: priority,
                  callback: typeof callback === 'function' ? callback : null
              };

              q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        // Start with a normal queue
        var q = async.queue(worker, concurrency);

        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
          _insert(q, data, priority, callback);
        };

        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
      return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require('_process'))
},{"_process":84}],23:[function(require,module,exports){
/*
 * Cylonjs ARDrone adaptor
 * http://cylonjs.com
 *
 * Copyright (c) 2013 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var LibARDrone = require("ar-drone"),
    Cylon = require("cylon");

var Commands = require("./commands");

var events = [
  /**
   * Emitted when the ARDrone has new navigation data
   *
   * @event navdata
   */
  "navdata",

  /**
   * Emitted when the ARDrone is landing
   *
   * @event landing
   */
  "landing",

  /**
   * Emitted when the ARDrone has landed
   *
   * @event landed
   */
  "landed",

  /**
   * Emitted when the ARDrone has taken off
   *
   * @event takeoff
   */
  "takeoff",

  /**
   * Emitted when the ARDrone is hovering
   *
   * @event hovering
   */
  "hovering",

  /**
   * Emitted when the ARDrone is flying
   *
   * @event flying
   */
  "flying",

  /**
   * Emitted when the ARDrone has a low battery
   *
   * @event lowBattery
   */
  "lowBattery",

  /**
   * Emitted when the ARDrone"s battery percentage has changed
   *
   * @event batteryChange
   */
  "batteryChange",

  /**
   * Emitted when the ARDrone"s altitude has changed
   *
   * @event altitudeChange
   */
  "altitudeChange"
];

/**
 * An ARDrone adaptor
 *
 * @constructor ardrone
 *
 * @param {Object} opts
 * @param {String=} opts.host IP address of the ARDrone
 */
var ARDrone = module.exports = function ARDrone(opts) {
  ARDrone.__super__.constructor.apply(this, arguments);
  opts = opts || {};

  this.ip = opts.host || opts.port || "192.168.1.1";

  this.connector = this.ardrone = null;

  this.events = events;
};

/** Subclasses the Cylon.Adaptor class */
Cylon.Utils.subclass(ARDrone, Cylon.Adaptor);

/**
 * Connects to the ARDrone
 *
 * @param {Function} callback to be triggered when connected
 * @return {null}
 */
ARDrone.prototype.connect = function(callback) {
  this.connector = this.ardrone = new LibARDrone.createClient({
    ip: this.ip
  });

  this.proxyMethods(Commands, this.ardrone, this);

  this.events.forEach(function(name) {
    this.defineAdaptorEvent(name);
  }.bind(this));

  callback();
};

/**
 * Disconnects from the ARDrone
 *
 * @param {Function} callback to be triggered when disconnected
 * @return {null}
 */
ARDrone.prototype.disconnect = function(callback) {
  callback();
};

},{"./commands":24,"ar-drone":27,"cylon":54}],24:[function(require,module,exports){
/*
 * Cylonjs ARDrone commands
 * http://cylonjs.com
 *
 * Copyright (c) 2013 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

module.exports = [
  // The default ARDrone commands

  /**
   * Sets the internal 'fly' state to 'true'.
   *
   * @param {Function} callback function to be invoked once the drone is
   * hovering
   * @return {Boolean|null}
   * @publish
   */
  "takeoff",

  /**
   * Sets the internal 'fly' state to 'false'.
   *
   * @param {Function} callback function to be invoked when the drone has landed
   * @return {Boolean|null}
   * @publish
   */
  "land",

  /**
   * Sets all drone movements to 0.
   *
   * This effectively makes it hover in place.
   *
   * @return {null}
   * @publish
   */
  "stop",

  /**
   * Makes the drone gain altitude.
   *
   * @param {Number} speed a 0-1 value for how fast the drone should climb
   * @return {Number}
   * @publish
   */
  "up",

  /**
   * Makes the drone lose altitude.
   *
   * @param {Number} speed a 0-1 value for how fast the drone should fall
   * @return {Number}
   * @publish
   */
  "down",

  /**
   * Makes the drone bank to the left.
   *
   * Controls the roll and horizontal movement using the camera as a reference
   * point.
   *
   * @param {Number} speed a 0-1 value for how fast the drone moves left
   * @return {Number}
   * @publish
   */
  "left",

  /**
   * Makes the drone bank to the right.
   *
   * Controls the roll and horizontal movement using the camera as a reference
   * point.
   *
   * @param {Number} speed a 0-1 value for how fast the drone moves right
   * @return {Number}
   * @publish
   */
  "right",

  /**
   * Makes the drone bank forwards.
   *
   * Controls the pitch and horizontal movement using the camera as a reference
   * point.
   *
   * @param {Number} speed a 0-1 value for how fast the drone moves forward
   * @return {Number}
   * @publish
   */
  "front",

  /**
   * Makes the drone bank backwards.
   *
   * Controls the pitch and horizontal movement using the camera as a reference
   * point.
   *
   * @param {Number} speed a 0-1 value for how fast the drone moves backwards
   * @return {Number}
   * @publish
   */
  "back",

  /**
   * Makes the drone spin in a clockwise direction
   *
   * @param {Number} speed a 0-1 value for how fast the drone should spin
   * @return {Number}
   * @publish
   */
  "clockwise",

  /**
   * Makes the drone spin in a counter-clockwise direction
   *
   * @param {Number} speed a 0-1 value for how fast the drone should spin
   * @return {Number}
   * @publish
   */
  "counterClockwise",

  /**
   * Tells the drone to calibrate a device
   *
   * @param {Number} deviceNum the device the drone should calibrate
   * @return {null}
   * @publish
   */
  "calibrate",

  /**
   * Tells the drone to set a configuration value
   *
   * @param {String} key the config value to set
   * @param {String} value the value to set it to
   * @param {Function} callback a callback to be triggered when it's done
   * @return {null}
   * @publish
   */
  "config",

  /**
   * Performs a pre-programmed flight sequence for a given duration.
   *
   * @param {String} animation the animation to perform
   * @param {Number} duration the duration to perform the animation
   * @return {null}
   * @publish
   */
  "animate",

  /**
   * Performs a pre-programmed LED animation sequence for a given duration, at
   * a given frequency.
   *
   * @param {String} animation the animation to perform
   * @param {Number} hz the frequency to perform the animation at
   * @param {Number} duration the duration to perform the animation
   * @return {null}
   * @publish
   */
  "animateLeds",

  /**
   * Resets the emergency state of the drone.
   *
   * It does this by setting the emergency REF bit to `1` until
   * `navdata.droneState.emergencyLanding` is `0`.
   *
   * This reccovers a drone that has flipped over and shows red lights to be
   * flyable again (with green LEDs).
   *
   * It is also done implicitly when creating a new high-level client.
   *
   * @return {null}
   * @publish
   */
  "disableEmergency",

  // Custom ARDrone commands that we add, mostly aliases for other commands

  /**
   * Makes the drone bank forwards.
   *
   *
   * @see front
   * @param {Number} speed a 0-1 value for how fast the drone moves forward
   * @return {Number}
   * @publish
   */
  "forward",

  /**
   * Tells the drone to do as many front flips as it can in `duration`.
   *
   * @param {Number} duration the duration to do front-flips for
   * @return {null}
   * @publish
   */
  "frontFlip",

  /**
   * Tells the drone to do as many back flips as it can in `duration`.
   *
   * @param {Number} duration the duration to do back-flips for
   * @return {null}
   * @publish
   */
  "backFlip",

  /**
   * Tells the drone to do as many left flips as it can in `duration`.
   *
   * @param {Number} duration the duration to do left-flips for
   * @return {null}
   * @publish
   */
  "leftFlip",

  /**
   * Tells the drone to do as many right flips as it can in `duration`.
   *
   * @param {Number} duration the duration to do right-flips for
   * @return {null}
   * @publish
   */
  "rightFlip",

  /**
   * Tells the drone to do as many waves as it can in `duration`.
   *
   * @param {Number} duration the duration to wave for
   * @return {null}
   * @publish
   */
  "wave",

  /**
   * Requests a stream of PNGs from the ARDrone's camera.
   *
   * PNGs are emitted through the `data` event on the returned object as they
   * become ready.
   *
   * @return {Object} an object that streams PNGs from the drone's camera
   * @publish
   */
  "getPngStream",

  /**
   * Tells the drone to hover in place.
   *
   * @see stop
   * @param {Number} duration the duration to wave for
   * @return {null}
   * @publish
   */
  "hover"
];

},{}],25:[function(require,module,exports){
/*
 * Cylong ARDrone flight commander driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

var Commands = require("./commands");

/**
 * An ARDrone Flight driver
 *
 * @constructor ardrone
 */
var Flight = module.exports = function Flight() {
  Flight.__super__.constructor.apply(this, arguments);
  this.setupCommands(Commands);
};

/** Subclasses the Cylon.Driver class */
Cylon.Utils.subclass(Flight, Cylon.Driver);

/**
 * Starts the ARDrone driver
 *
 * @param {Function} callback to be triggered when started
 * @return {null}
 */
Flight.prototype.start = function(callback) {
  callback();
};

/**
 * Stops the ARDrone driver
 *
 * @param {Function} callback to be triggered when halted
 * @return {null}
 */
Flight.prototype.halt = function(callback) {
  callback();
};

/**
 * Tells the drone to hover in place.
 *
 * @see stop
 * @param {Number} duration the duration to wave for
 * @return {null}
 * @publish
 */
Flight.prototype.hover = function() {
  return this.connection.stop();
};

/**
 * Makes the drone bank forwards.
 *
 *
 * @see front
 * @param {Number} speed a 0-1 value for how fast the drone moves forward
 * @return {Number}
 * @publish
 */
Flight.prototype.forward = function(speed) {
  return this.connection.front(speed);
};

/**
 * Tells the drone to do as many front flips as it can in `duration`.
 *
 * @param {Number} duration the duration to do front-flips for
 * @return {null}
 * @publish
 */
Flight.prototype.frontFlip = function() {
  return this.connection.animate("flipAhead", 150);
};

/**
 * Tells the drone to do as many back flips as it can in `duration`.
 *
 * @param {Number} duration the duration to do back-flips for
 * @return {null}
 * @publish
 */
Flight.prototype.backFlip = function() {
  return this.connection.animate("flipBehind", 150);
};

/**
 * Tells the drone to do as many left flips as it can in `duration`.
 *
 * @param {Number} duration the duration to do left-flips for
 * @return {null}
 * @publish
 */
Flight.prototype.leftFlip = function() {
  return this.connection.animate("flipLeft", 150);
};

/**
 * Tells the drone to do as many right flips as it can in `duration`.
 *
 * @param {Number} duration the duration to do right-flips for
 * @return {null}
 * @publish
 */
Flight.prototype.rightFlip = function() {
  return this.connection.animate("flipRight", 150);
};

/**
 * Tells the drone to do as many waves as it can in `duration`.
 *
 * @param {Number} duration the duration to wave for
 * @return {null}
 * @publish
 */
Flight.prototype.wave = function() {
  return this.connection.animate("wave", 750);
};

},{"./commands":24,"cylon":54}],26:[function(require,module,exports){
/*
 * Cylong ARDrone navigation data driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

var events = [
  /**
   * Emitted when the ARDrone has new navigation data
   *
   * @event navdata
   */
  "navdata",

  /**
   * Emitted when the ARDrone is landing
   *
   * @event landing
   */
  "landing",

  /**
   * Emitted when the ARDrone has landed
   *
   * @event landed
   */
  "landed",

  /**
   * Emitted when the ARDrone has taken off
   *
   * @event takeoff
   */
  "takeoff",

  /**
   * Emitted when the ARDrone is hovering
   *
   * @event hovering
   */
  "hovering",

  /**
   * Emitted when the ARDrone is flying
   *
   * @event flying
   */
  "flying",

  /**
   * Emitted when the ARDrone has a low battery
   *
   * @event lowBattery
   */
  "lowBattery",

  /**
   * Emitted when the ARDrone"s battery percentage has changed
   *
   * @event batteryChange
   */
  "batteryChange",

  /**
   * Emitted when the ARDrone"s altitude has changed
   *
   * @event altitudeChange
   */
  "altitudeChange"
];

/**
 * An ARDrone Nav driver
 *
 * @constructor ardrone-nav
 */
var Nav = module.exports = function Nav() {
  Nav.__super__.constructor.apply(this, arguments);

  this.events = events;
};

/** Subclasses the Cylon.Driver class */
Cylon.Utils.subclass(Nav, Cylon.Driver);

/**
 * Starts the driver
 *
 * @param {Function} callback to be triggered when started
 * @return {null}
 */
Nav.prototype.start = function(callback) {
  this.events.forEach(function(e) {
    this.defineDriverEvent({ eventName: e });
  }.bind(this));

  callback();
};

/**
 * Stops the driver
 *
 * @param {Function} callback to be triggered when halted
 * @return {null}
 */
Nav.prototype.halt = function(callback) {
  callback();
};

},{"cylon":54}],27:[function(require,module,exports){
var arDrone = exports;

exports.Client           = require('./lib/Client');
exports.UdpControl       = require('./lib/control/UdpControl');
exports.PngStream        = require('./lib/video/PngStream');
exports.UdpNavdataStream = require('./lib/navdata/UdpNavdataStream');

exports.createClient = function(options) {
  var client = new arDrone.Client(options);
  client.resume();
  return client;
};

exports.createUdpControl = function(options) {
  return new arDrone.UdpControl(options);
};

exports.createPngStream = function(options) {
  var stream = new arDrone.PngStream(options);
  stream.resume();
  return stream;
};

exports.createUdpNavdataStream = function(options) {
  var stream = new arDrone.UdpNavdataStream(options);
  stream.resume();
  return stream;
};

},{"./lib/Client":28,"./lib/control/UdpControl":33,"./lib/navdata/UdpNavdataStream":37,"./lib/video/PngStream":41}],28:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter;
var util         = require('util');

Client.UdpControl       = require('./control/UdpControl');
Client.Repl             = require('./Repl');
Client.UdpNavdataStream = require('./navdata/UdpNavdataStream');
Client.PngStream        = require('./video/PngStream');
Client.PngEncoder       = require('./video/PngEncoder');
Client.TcpVideoStream   = require('./video/TcpVideoStream');

module.exports = Client;
util.inherits(Client, EventEmitter);
function Client(options) {
  EventEmitter.call(this);

  options = options || {};

  this._options           = options;
  this._udpControl        = options.udpControl || new Client.UdpControl(options);
  this._udpNavdatasStream = options.udpNavdataStream || new Client.UdpNavdataStream(options);
  this._pngStream         = null;
  this._tcpVideoStream    = null;
  this._interval          = null;
  this._ref               = {};
  this._pcmd              = {};
  this._repeaters         = [];
  this._afterOffset       = 0;
  this._disableEmergency  = false;
  this._lastState         = 'CTRL_LANDED';
  this._lastBattery       = 100;
  this._lastAltitude      = 0;
}

Client.prototype.after = function(duration, fn) {
  setTimeout(fn.bind(this), this._afterOffset + duration);
  this._afterOffset += duration;
  return this;
};

Client.prototype.createRepl = function() {
  var repl = new Client.Repl(this);
  repl.resume();
  return repl;
};

Client.prototype.createPngStream = function() {
  console.warn("Client.createPngStream is deprecated. Use Client.getPngStream instead.");
  return this.getPngStream();
};

Client.prototype.getPngStream = function() {
  if (this._pngStream === null) {
    this._pngStream = this._newPngStream();
  }
  return this._pngStream;
};

Client.prototype.getVideoStream = function() {
  if (!this._tcpVideoStream) {
    this._tcpVideoStream = this._newTcpVideoStream();
  }
  return this._tcpVideoStream;
};

Client.prototype._newTcpVideoStream = function() {
  var stream = new Client.TcpVideoStream(this._options);
  var callback = function(err) {
    if (err) {
      console.log('TcpVideoStream error: %s', err.message);
      setTimeout(function () {
        console.log('Attempting to reconnect to TcpVideoStream...');
        stream.connect(callback);
      }, 1000);
    }
  };

  stream.connect(callback);
  stream.on('error', callback);
  return stream;
};

Client.prototype._newPngStream = function() {
  var videoStream = this.getVideoStream();
  var pngEncoder = new Client.PngEncoder(this._options);

  videoStream.on('data', function(data) {
    pngEncoder.write(data);
  });

  return pngEncoder;
};

Client.prototype.resume = function() {
  // Reset config ACK.
  this._udpControl.ctrl(5, 0);
  // request basic navdata by default
  this.config('general:navdata_demo', 'TRUE');
  this.disableEmergency();
  this._setInterval(30);

  this._udpNavdatasStream.removeAllListeners();
  this._udpNavdatasStream.resume();
  this._udpNavdatasStream
    .on('error', this._maybeEmitError.bind(this))
    .on('data', this._handleNavdata.bind(this));
};

Client.prototype._handleNavdata = function(navdata) {
  if (navdata.droneState && navdata.droneState.emergencyLanding && this._disableEmergency) {
    this._ref.emergency = true;
  } else {
    this._ref.emergency    = false;
    this._disableEmergency = false;
  }
  if (navdata.droneState.controlCommandAck) {
    this._udpControl.ack();
  } else {
    this._udpControl.ackReset();
  }
  this.emit('navdata', navdata);
  this._processNavdata(navdata);
};

Client.prototype._processNavdata = function(navdata) {
  if (navdata.droneState && navdata.demo) {
    // controlState events
    var cstate = navdata.demo.controlState;
    var emitState = (function(e, state) {
      if (cstate === state && this._lastState !== state) {
        return this.emit(e);
      }
    }).bind(this);
    emitState('landing', 'CTRL_TRANS_LANDING');
    emitState('landed', 'CTRL_LANDED');
    emitState('takeoff', 'CTRL_TRANS_TAKEOFF');
    emitState('hovering', 'CTRL_HOVERING');
    emitState('flying', 'CTRL_FLYING');
    this._lastState = cstate;

    // battery events
    var battery = navdata.demo.batteryPercentage;
    if (navdata.droneState.lowBattery === 1) {
      this.emit('lowBattery', battery);
    }
    if (navdata.demo.batteryPercentage !== this._lastBattery) {
      this.emit('batteryChange', battery);
      this._lastBattery = battery;
    }

    // altitude events
    var altitude = navdata.demo.altitudeMeters;
    if (altitude !== this._lastAltitude) {
      this.emit('altitudeChange', altitude);
      this._lastAltitude = altitude;
    }
  }

};

// emits an 'error' event, but only if somebody is listening. This avoids
// making node's EventEmitter throwing an exception for non-critical errors
Client.prototype._maybeEmitError = function(err) {
  if (this.listeners('error').length > 0) {
    this.emit('error', err);
  }
};

Client.prototype._setInterval = function(duration) {
  clearInterval(this._interval);
  this._interval = setInterval(this._sendCommands.bind(this), duration);
};

Client.prototype._sendCommands = function() {
  this._udpControl.ref(this._ref);
  this._udpControl.pcmd(this._pcmd);
  this._udpControl.flush();

  this._repeaters
    .forEach(function(repeat) {
      repeat.times--;
      repeat.method();
    });

  this._repeaters = this._repeaters.filter(function(repeat) {
    return repeat.times > 0;
  });
};

Client.prototype.disableEmergency = function() {
  this._disableEmergency = true;
};

Client.prototype.takeoff = function(cb) {
  this.once('hovering', cb || function() {});
  this._ref.fly = true;
  return true;
};

Client.prototype.land = function(cb) {
  this.once('landed', cb || function() {});
  this._ref.fly = false;
  return true;
};

Client.prototype.stop = function() {
  this._pcmd = {};
  return true;
};

Client.prototype.calibrate = function(device_num) {
  this._udpControl.calibrate(device_num);
};

Client.prototype.ftrim = function() {
  // @TODO Figure out if we can get a ACK for this, so we don't need to
  // repeat it blindly like this

  if(this._ref.fly) {
    console.trace("You can’t ftrim when you fly");
    return false;
  }

  var self = this;
  this._repeat(10, function() {
    self._udpControl.ftrim();
  });
};

Client.prototype.config = function(key, value, callback) {
  this._udpControl.config(key, value, callback);
};

Client.prototype.ctrl = function(controlMode, otherMode) {
  this._udpControl.ctrl(controlMode, otherMode);
};

Client.prototype.animate = function(animation, duration) {
  // @TODO Figure out if we can get a ACK for this, so we don't need to
  // repeat it blindly like this
  var self = this;
  this._repeat(10, function() {
    self._udpControl.animate(animation, duration);
  });
};

Client.prototype.animateLeds = function(animation, hz, duration) {
  // @TODO Figure out if we can get a ACK for this, so we don't need to
  // repeat it blindly like this
  var self = this;
  this._repeat(10, function() {
    self._udpControl.animateLeds(animation, hz, duration);
  });
};

Client.prototype.battery = function() {
  return this._lastBattery;
};

Client.prototype._repeat = function(times, fn) {
  this._repeaters.push({times: times, method: fn});
};

var pcmdOptions = [
  ['up', 'down'],
  ['left', 'right'],
  ['front', 'back'],
  ['clockwise', 'counterClockwise'],
];

pcmdOptions.forEach(function(pair) {
  Client.prototype[pair[0]] = function(speed) {
    if (isNaN(speed)) {
      return;
    }
    speed = parseFloat(speed);

    this._pcmd[pair[0]] = speed;
    delete this._pcmd[pair[1]];

    return speed;
  };

  Client.prototype[pair[1]] = function(speed) {
    if (isNaN(speed)) {
      return;
    }

    speed = parseFloat(speed);

    this._pcmd[pair[1]] = speed;
    delete this._pcmd[pair[0]];

    return speed;
  };
});

},{"./Repl":29,"./control/UdpControl":33,"./navdata/UdpNavdataStream":37,"./video/PngEncoder":39,"./video/PngStream":41,"./video/TcpVideoStream":42,"events":81,"util":99}],29:[function(require,module,exports){
var repl       = require('repl');

module.exports = Repl;
function Repl(client) {
  this._client   = client;
  this._repl     = null;
  this._nodeEval = null;
}

Repl.prototype.resume = function() {
  this._repl = repl.start({
    prompt : 'drone> ',
  });

  /* jshint evil:true */
  this._nodeEval = this._repl.eval;

  // @TODO This does not seem to work for animate('yawShake', 2000), need
  // to fix this.
  //this._repl.eval = this._eval.bind(this);

  this._setupAutocomplete();
};

Repl.prototype._setupAutocomplete = function() {
  for (var property in this._client) {
    if (property.substr(0, 1) === '_') {
      // Skip "private" properties
      continue;
    }

    var value = this._client[property];
    if (typeof value === 'function') {
      value = value.bind(this._client);
    }

    this._repl.context[property] = value;
  }

  this._repl.context.client = this._client;
};

Repl.prototype._eval = function(code, context, filename, cb) {
  var args = code.match(/[^() \n]+/g);
  if (!args) {
    return this._nodeEval.apply(this._repl, arguments);
  }

  var property = args.shift();
  if (!this._client[property]) {
    return this._nodeEval.apply(this._repl, arguments);
  }

  var type = typeof this._client[property];

  if (type === 'function') {
    try {
      cb(null, this._client[property].apply(this._client, args));
    } catch (err) {
      cb(err);
    }
    return;
  }

  if (args.length > 1) {
    // Don't accept more than 1 argument
    cb(new Error('Cannot set property "' + property + '". Too many arguments.'));
    return;
  }

  if (args.length === 1) {
    // Set a client property
    cb(null, this._client[property] = args[1]);
    return;
  }

  // args.length === 0, return property value
  cb(null, this._client[property]);
};

},{"repl":72}],30:[function(require,module,exports){
(function (process){
// Constants required to decode/encode the network communication with the drone.
// Names taken from the official SDK are not renamed, but:
//
// * Consistent prefixes/suffixes are stripped
// * Always converted to UPPER_CASE

var constants = module.exports;

constants.getName = function(group, value) {
  group = this[group];

  for (var name in group) {
    if (group[name] === value) {
      return name;
    }
  }
};

constants.DEFAULT_DRONE_IP = process.env.DEFAULT_DRONE_IP || '192.168.1.1';

// from ARDrone_SDK_2_0/ARDroneLib/Soft/Common/config.h
constants.ports = {
  FTP            : 5551,
  AUTH           : 5552,
  VIDEO_RECORDER : 5553,
  NAVDATA        : 5554,
  VIDEO          : 5555,
  AT             : 5556,
  RAW_CAPTURE    : 5557,
  PRINTF         : 5558,
  CONTROL        : 5559
};

// from ARDrone_SDK_2_0/ARDroneLib/Soft/Common/config.h
constants.droneStates = {
  FLY_MASK            : 1 << 0,  /*!< FLY MASK : (0) ardrone is landed, (1) ardrone is flying */
  VIDEO_MASK          : 1 << 1,  /*!< VIDEO MASK : (0) video disable, (1) video enable */
  VISION_MASK         : 1 << 2,  /*!< VISION MASK : (0) vision disable, (1) vision enable */
  CONTROL_MASK        : 1 << 3,  /*!< CONTROL ALGO : (0) euler angles control, (1) angular speed control */
  ALTITUDE_MASK       : 1 << 4,  /*!< ALTITUDE CONTROL ALGO : (0) altitude control inactive (1) altitude control active */
  USER_FEEDBACK_START : 1 << 5,  /*!< USER feedback : Start button state */
  COMMAND_MASK        : 1 << 6,  /*!< Control command ACK : (0) None, (1) one received */
  CAMERA_MASK         : 1 << 7,  /*!< CAMERA MASK : (0) camera not ready, (1) Camera ready */
  TRAVELLING_MASK     : 1 << 8,  /*!< Travelling mask : (0) disable, (1) enable */
  USB_MASK            : 1 << 9,  /*!< USB key : (0) usb key not ready, (1) usb key ready */
  NAVDATA_DEMO_MASK   : 1 << 10, /*!< Navdata demo : (0) All navdata, (1) only navdata demo */
  NAVDATA_BOOTSTRAP   : 1 << 11, /*!< Navdata bootstrap : (0) options sent in all or demo mode, (1) no navdata options sent */
  MOTORS_MASK         : 1 << 12, /*!< Motors status : (0) Ok, (1) Motors problem */
  COM_LOST_MASK       : 1 << 13, /*!< Communication Lost : (1) com problem, (0) Com is ok */
  SOFTWARE_FAULT      : 1 << 14, /*!< Software fault detected - user should land as quick as possible (1) */
  VBAT_LOW            : 1 << 15, /*!< VBat low : (1) too low, (0) Ok */
  USER_EL             : 1 << 16, /*!< User Emergency Landing : (1) User EL is ON, (0) User EL is OFF*/
  TIMER_ELAPSED       : 1 << 17, /*!< Timer elapsed : (1) elapsed, (0) not elapsed */
  MAGNETO_NEEDS_CALIB : 1 << 18, /*!< Magnetometer calibration state : (0) Ok, no calibration needed, (1) not ok, calibration needed */
  ANGLES_OUT_OF_RANGE : 1 << 19, /*!< Angles : (0) Ok, (1) out of range */
  WIND_MASK           : 1 << 20, /*!< WIND MASK: (0) ok, (1) Too much wind */
  ULTRASOUND_MASK     : 1 << 21, /*!< Ultrasonic sensor : (0) Ok, (1) deaf */
  CUTOUT_MASK         : 1 << 22, /*!< Cutout system detection : (0) Not detected, (1) detected */
  PIC_VERSION_MASK    : 1 << 23, /*!< PIC Version number OK : (0) a bad version number, (1) version number is OK */
  ATCODEC_THREAD_ON   : 1 << 24, /*!< ATCodec thread ON : (0) thread OFF (1) thread ON */
  NAVDATA_THREAD_ON   : 1 << 25, /*!< Navdata thread ON : (0) thread OFF (1) thread ON */
  VIDEO_THREAD_ON     : 1 << 26, /*!< Video thread ON : (0) thread OFF (1) thread ON */
  ACQ_THREAD_ON       : 1 << 27, /*!< Acquisition thread ON : (0) thread OFF (1) thread ON */
  CTRL_WATCHDOG_MASK  : 1 << 28, /*!< CTRL watchdog : (1) delay in control execution (> 5ms), (0) control is well scheduled */
  ADC_WATCHDOG_MASK   : 1 << 29, /*!< ADC Watchdog : (1) delay in uart2 dsr (> 5ms), (0) uart2 is good */
  COM_WATCHDOG_MASK   : 1 << 30, /*!< Communication Watchdog : (1) com problem, (0) Com is ok */
  EMERGENCY_MASK      : 1 << 31  /*!< Emergency landing : (0) no emergency, (1) emergency */
};


// from ARDrone_SDK_2_0/ARDroneLib/Soft/Common/navdata_keys.h
constants.options = {
  DEMO              : 0,
  TIME              : 1,
  RAW_MEASURES      : 2,
  PHYS_MEASURES     : 3,
  GYROS_OFFSETS     : 4,
  EULER_ANGLES      : 5,
  REFERENCES        : 6,
  TRIMS             : 7,
  RC_REFERENCES     : 8,
  PWM               : 9,
  ALTITUDE          : 10,
  VISION_RAW        : 11,
  VISION_OF         : 12,
  VISION            : 13,
  VISION_PERF       : 14,
  TRACKERS_SEND     : 15,
  VISION_DETECT     : 16,
  WATCHDOG          : 17,
  ADC_DATA_FRAME    : 18,
  VIDEO_STREAM      : 19,
  GAMES             : 20,
  PRESSURE_RAW      : 21,
  MAGNETO           : 22,
  WIND_SPEED        : 23,
  KALMAN_PRESSURE   : 24,
  HDVIDEO_STREAM    : 25,
  WIFI              : 26,
  ZIMMU_3000        : 27,
  CKS               : 65535
};

constants.CAD_TYPE = {
  HORIZONTAL              : 0,   /*<! Deprecated */
  VERTICAL                : 1,   /*<! Deprecated */
  VISION                  : 2,   /*<! Detection of 2D horizontal tags on drone shells */
  NONE                    : 3,   /*<! Detection disabled */
  COCARDE                 : 4,   /*<! Detects a roundel under the drone */
  ROUNDEL                 : 4,   /*<! Detects a roundel under the drone */
  ORIENTED_COCARDE        : 5,   /*<! Detects an oriented roundel under the drone */
  ORIENTED_ROUNDEL        : 5,   /*<! Detects an oriented roundel under the drone */
  STRIPE                  : 6,   /*<! Detects a uniform stripe on the ground */
  H_COCARDE               : 7,   /*<! Detects a roundel in front of the drone */
  H_ROUNDEL               : 7,   /*<! Detects a roundel in front of the drone */
  H_ORIENTED_COCARDE      : 8,   /*<! Detects an oriented roundel in front of the drone */
  H_ORIENTED_ROUNDEL      : 8,   /*<! Detects an oriented roundel in front of the drone */
  STRIPE_V                : 9,
  MULTIPLE_DETECTION_MODE : 10,  /* The drone uses several detections at the same time */
  CAP                     : 11,  /*<! Detects a Cap orange and green in front of the drone */
  ORIENTED_COCARDE_BW     : 12,  /*<! Detects the black and white roundel */
  ORIENTED_ROUNDEL_BW     : 12,  /*<! Detects the black and white roundel */
  VISION_V2               : 13,  /*<! Detects 2nd version of shell/tag in front of the drone */
  TOWER_SIDE              : 14,  /*<! Detect a tower side with the front camera */
  NUM                     : 15   /*<! Number of possible values for CAD_TYPE */
};

constants.TAG_TYPE = {
  NONE             : 0,
  SHELL_TAG        : 1,
  ROUNDEL          : 2,
  ORIENTED_ROUNDEL : 3,
  STRIPE           : 4,
  CAP              : 5,
  SHELL_TAG_V2     : 6,
  TOWER_SIDE       : 7,
  BLACK_ROUNDEL    : 8,
  NUM              : 9
};

constants.FLYING_MODE = {
  FREE_FLIGHT                      : 0,       /**< Normal mode, commands are enabled */
  HOVER_ON_TOP_OF_ROUNDEL          : 1 << 0,  /**< Commands are disabled, drones hovers on top of a roundel - roundel detection MUST be activated by the user with 'detect_type' configuration. */
  HOVER_ON_TOP_OF_ORIENTED_ROUNDEL : 1 << 1   /**< Commands are disabled, drones hovers on top of an oriented roundel - oriented roundel detection MUST be activated by the user with 'detect_type' configuration. */
};

constants.ARDRONE_DETECTION_COLOR = {
  ORANGE_GREEN       : 1,    /*!< Cameras detect orange-green-orange tags */
  ORANGE_YELLOW      : 2,    /*!< Cameras detect orange-yellow-orange tags*/
  ORANGE_BLUE        : 3,    /*!< Cameras detect orange-blue-orange tags */
  ARRACE_FINISH_LINE : 0x10,
  ARRACE_DONUT       : 0x11
};

}).call(this,require('_process'))
},{"_process":84}],31:[function(require,module,exports){
module.exports = AtCommand;
function AtCommand(type, args, blocks, options, callback) {
  this.type   = type;
  this.args   = args;
  if (blocks === undefined) {
    blocks = false;
  }
  this.blocks = blocks;
  this.options = options || {};
  this.callback = callback;
}

AtCommand.prototype.serialize = function(sequenceNumber) {
  var args = [sequenceNumber].concat(this.args);
  return 'AT*' + this.type + '=' + args.join(',') + '\r';
};

},{}],32:[function(require,module,exports){
var AtCommand = require('./AtCommand');
var at        = require('./at');

var exports = module.exports = AtCommandCreator;
function AtCommandCreator() {
}

AtCommandCreator.prototype.raw = function(type, args, blocks, options, callback) {
  args = (Array.isArray(args))
    ? args
    : Array.prototype.slice.call(arguments, 1);

  return new AtCommand(type, args, blocks, options, callback);
};

AtCommandCreator.prototype.ctrl = function(controlMode, otherMode) {
  var args = [controlMode, otherMode];
  return this.raw('CTRL', args);
};

// Used for fly/land as well as emergency trigger/recover
AtCommandCreator.prototype.ref = function(options) {
  options = options || {};

  var args = [0];

  if (options.fly) {
    args[0] = args[0] | REF_FLAGS.takeoff;
  }

  if (options.emergency) {
    args[0] = args[0] | REF_FLAGS.emergency;
  }

  return this.raw('REF', args);
};

// Used to fly the drone around
AtCommandCreator.prototype.pcmd = function(options) {
  options = options || {};

  // flags, leftRight, frontBack, upDown, clockWise
  var args = [0, 0, 0, 0, 0];

  for (var key in options) {
    var alias = PCMD_ALIASES[key];
    var value = options[key];

    if (alias.invert) {
      value = -value;
    }

    args[alias.index] = at.floatString(value);
    args[0]           = args[0] | PCMD_FLAGS.progressive;
  }

  return this.raw('PCMD', args);
};

AtCommandCreator.prototype.calibrate = function(device_num) {
  var args = [device_num];

  return this.raw('CALIB', args);
};

// Can be called either as config(key, value, callback) or
// config(options, callback) where options has at least keys "key" and
// "value" (but may also have other keys).
AtCommandCreator.prototype.config = function(key, value, callback) {
  var options;
  if (key && typeof(key) === 'object') {
    // Called with signature (options, callback).
    options = key;
    callback = value;
    key = options.key;
    value = options.value;
  } else {
    options = {};
  }
  return this.raw('CONFIG', ['"' + key + '"', '"' + value + '"'], true, options, callback);
};

AtCommandCreator.prototype.ctrl = function(a, b) {
  return this.raw('CTRL', [a, b]);
};

// TMP: Used to send FTRIM
AtCommandCreator.prototype.ftrim = function() {
  return this.raw('FTRIM');
};

AtCommandCreator.prototype.animateLeds = function(name, hz, duration) {
  // Default animation
  name     = name || 'redSnake';
  hz       = hz || 2;
  duration = duration || 3;

  var animationId = LED_ANIMATIONS.indexOf(name);
  if (animationId < 0) {
    throw new Error('Unknown led animation: ' + name);
  }

  hz = at.floatString(hz);

  var params = [animationId, hz, duration].join(',');
  return this.config('leds:leds_anim', params);
};

AtCommandCreator.prototype.animate = function(name, duration) {
  var animationId = ANIMATIONS.indexOf(name);
  if (animationId < 0) {
    throw new Error('Unknown animation: ' + name);
  }

  var params = [animationId, duration].join(',');
  return this.config('control:flight_anim', params);
};

// Constants

var REF_FLAGS = exports.REF_FLAGS = {
  emergency : (1 << 8),
  takeoff   : (1 << 9),
};

var PCMD_FLAGS = exports.PCMD_FLAGS = {
  progressive : (1 << 0),
};

var PCMD_ALIASES = exports.PCMD_ALIASES = {
  left             : {index: 1, invert: true},
  right            : {index: 1, invert: false},
  front            : {index: 2, invert: true},
  back             : {index: 2, invert: false},
  up               : {index: 3, invert: false},
  down             : {index: 3, invert: true},
  clockwise        : {index: 4, invert: false},
  counterClockwise : {index: 4, invert: true},
};

// from ARDrone_SDK_2_0/ControlEngine/iPhone/Release/ARDroneGeneratedTypes.h
var LED_ANIMATIONS = exports.LED_ANIMATIONS = [
  'blinkGreenRed',
  'blinkGreen',
  'blinkRed',
  'blinkOrange',
  'snakeGreenRed',
  'fire',
  'standard',
  'red',
  'green',
  'redSnake',
  'blank',
  'rightMissile',
  'leftMissile',
  'doubleMissile',
  'frontLeftGreenOthersRed',
  'frontRightGreenOthersRed',
  'rearRightGreenOthersRed',
  'rearLeftGreenOthersRed',
  'leftGreenRightRed',
  'leftRedRightGreen',
  'blinkStandard',
];

// from ARDrone_SDK_2_0/ControlEngine/iPhone/Release/ARDroneGeneratedTypes.h
var ANIMATIONS = exports.ANIMATIONS = [
  'phiM30Deg',
  'phi30Deg',
  'thetaM30Deg',
  'theta30Deg',
  'theta20degYaw200deg',
  'theta20degYawM200deg',
  'turnaround',
  'turnaroundGodown',
  'yawShake',
  'yawDance',
  'phiDance',
  'thetaDance',
  'vzDance',
  'wave',
  'phiThetaMixed',
  'doublePhiThetaMixed',
  'flipAhead',
  'flipBehind',
  'flipLeft',
  'flipRight',
];

},{"./AtCommand":31,"./at":34}],33:[function(require,module,exports){
(function (Buffer){
var assert           = require('assert');
var dgram            = require('dgram');

var debug            = require('simple-debug')('udpcontrol');

var AtCommandCreator = require('./AtCommandCreator');
var meta             = require('../misc/meta');
var constants        = require('../constants');


var DEFAULT_TIMEOUT = 500;  // ms

var states = {
  NOT_BLOCKED: 'NOT_BLOCKED',
  WAITING_FOR_ACK: 'WAITING_FOR_ACK',
  WAITING_FOR_ACK_RESET: 'WAITING_FOR_ACK_RESET'
};



module.exports = UdpControl;
function UdpControl(options) {
  options = options || {};
  console.log(options)
  console.log(dgram)

  this._sequenceNumber = 0;
  this._socket     = options.socket || dgram.createSocket('udp4');
  this._port       = options.port || constants.ports.AT;
  this._ip         = options.ip ||  constants.DEFAULT_DRONE_IP;
  this.defaultTimeout = options.defaultTimeout || DEFAULT_TIMEOUT;
  this._cmdCreator = new AtCommandCreator();
  this._cmds       = [];
  this._blockingCmds = [];
  this._blocked = {
    state: states.NOT_BLOCKED,
    cmd: null,
    ackTimer: null
  };
}

meta.methods(AtCommandCreator).forEach(function(methodName) {
  UdpControl.prototype[methodName] = function() {
    var cmd = this._cmdCreator[methodName].apply(this._cmdCreator, arguments);
    if (cmd.blocks) {
      this._blockingCmds.push(cmd);
    } else {
      this._cmds.push(cmd);
    }
    return cmd;
  };
});

UdpControl.prototype.ack = function() {
  if (this._blocked.state === states.WAITING_FOR_ACK) {
    assert(this._blocked.cmd);
    assert(this._blocked.ackTimer);
    debug('Got ACK for ' + this._blocked.cmd);
    clearTimeout(this._blocked.ackTimer);
    this._blocked.ackTimer = null;
    if (this._blocked.cmd.callback) {
      this._blocked.cmd.callback.call(this, null);
    }
    this._blocked.state = states.WAITING_FOR_ACK_RESET;
    debug('Resetting ACK');
    this.ctrl(5, 0);
    // Send ctrl(5, 0) every 50 ms until we get an ACK reset.
    var self = this;
    this._blocked.ctrlTimer = setInterval(
      function() {
        if (self.state === states.WAITING_FOR_ACK_RESET) {
          self.ctrl(5, 0);
        } else {
          clearInterval(self._blocked.ctrlTimer);
          self._blocked.ctrlTimer = null;
        }
      },
      50);
  }
};

UdpControl.prototype.ackReset = function() {
  if (this._blocked.state === states.WAITING_FOR_ACK_RESET) {
    assert(this._blocked.cmd);
    debug('Got ACK reset');
    this._blocked.cmd = null;
    this._blocked.state = states.NOT_BLOCKED;
  }
};

UdpControl.prototype._handleAckTimeout = function() {
  assert(this._blocked.state === states.WAITING_FOR_ACK);
  assert(this._blocked.ackTimer);
  assert(this._blocked.cmd);
  this._blocked.ackTimer = null;
  debug('Blocking command timed out:');
  debug(this._blocked.cmd);
  if (this._blocked.cmd.callback) {
    this._blocked.cmd.callback.call(this, new Error('ACK Timeout'));
  }
  this._blocked.cmd = null;
  this._blocked.state = states.NOT_BLOCKED;
};


UdpControl.prototype.flush = function() {
  if (this._cmds.length) {
    this._sendCommands(this._cmds);
    this._cmds = [];
  }
  if (this._blocked.state == states.NOT_BLOCKED && this._blockingCmds.length) {
    // Send the blocking command.
    var cmd = this._blockingCmds.shift();
    this._blocked.cmd = cmd;
    this._sendCommands([cmd]);
    this._blocked.state = states.WAITING_FOR_ACK;
    this._blocked.ackTimer = setTimeout(
      this._handleAckTimeout.bind(this),
      cmd.options.timeout || this.defaultTimeout);
  }
};

UdpControl.prototype._sendCommands = function(commands) {
  var serialized = this._concat(commands);
  debug(serialized.replace('\r', '|'));
  var buffer = new Buffer(serialized);
  this._socket.send(buffer, 0, buffer.length, this._port, this._ip);
};

UdpControl.prototype._concat = function(commands) {
  var self = this;
  return commands.reduce(function(cmds, cmd) {
    return cmds + cmd.serialize(self._sequenceNumber++);
  }, '');
};

UdpControl.prototype.close = function() {
  this._socket.close();
};

}).call(this,require("buffer").Buffer)
},{"../constants":30,"../misc/meta":35,"./AtCommandCreator":32,"assert":73,"buffer":75,"dgram":72,"simple-debug":45}],34:[function(require,module,exports){
(function (Buffer){
// module for generic AT command related functionality
var at = exports;

at.floatString = function(number) {
  // Not sure if this is correct, but it works for the example provided in
  // the drone manual ... (should be revisted)
  var buffer = new Buffer(4);
  buffer.writeFloatBE(number, 0);
  return -~parseInt(buffer.toString('hex'), 16) - 1;
};

}).call(this,require("buffer").Buffer)
},{"buffer":75}],35:[function(require,module,exports){
var meta = exports;

// lists public methods of a class
meta.methods = function(Constructor) {
  var methods = Object.keys(Constructor.prototype);

  return methods.filter(function(name) {
    return !/^_/.test(name);
  });
};

},{}],36:[function(require,module,exports){
var util   = require('util');
var Reader = require('buffy').Reader;

module.exports = NavdataReader;
util.inherits(NavdataReader, Reader);
function NavdataReader(buffer) {
  Reader.call(this, buffer);
}

NavdataReader.prototype.int16 = function() {
  return this.int16LE();
};

NavdataReader.prototype.uint16 = function() {
  return this.uint16LE();
};

NavdataReader.prototype.int32 = function() {
  return this.int32LE();
};

NavdataReader.prototype.uint32 = function() {
  return this.uint32LE();
};

NavdataReader.prototype.float32 = function() {
  return this.float32LE();
};

NavdataReader.prototype.double64 = function() {
  return this.double64LE();
};

NavdataReader.prototype.char = function() {
  return this.uint8();
};

NavdataReader.prototype.bool = function() {
  return !!this.char();
};

NavdataReader.prototype.matrix33 = function() {
  return {
    m11 : this.float32(),
    m12 : this.float32(),
    m13 : this.float32(),
    m21 : this.float32(),
    m22 : this.float32(),
    m23 : this.float32(),
    m31 : this.float32(),
    m32 : this.float32(),
    m33 : this.float32()
  };
};

NavdataReader.prototype.vector31 = function() {
  return {
    x : this.float32(),
    y : this.float32(),
    z : this.float32()
  };
};

NavdataReader.prototype.screenPoint = function() {
  return {
    x : this.int32(),
    y : this.int32()
  };
};

NavdataReader.prototype.satChannel = function() {
  return {
    sat: this.uint8(),
    cn0: this.uint8()
  };
};

NavdataReader.prototype.mask32 = function(mask) {
  var value = this.uint32();
  return this._mask(mask, value);
};

NavdataReader.prototype._mask = function(mask, value) {
  var flags = {};
  for (var flag in mask) {
    flags[flag] = (value & mask[flag])
      ? 1
      : 0;
  }

  return flags;
};

},{"buffy":43,"util":99}],37:[function(require,module,exports){
(function (Buffer){
var Stream       = require('stream').Stream;
var util         = require('util');
var dgram        = require('dgram');
var constants    = require('../constants');
var parseNavdata = require('./parseNavdata');

module.exports = UdpNavdataStream;
util.inherits(UdpNavdataStream, Stream);
function UdpNavdataStream(options) {
  Stream.call(this);

  options = options || {};

  this.readable        = true;
  this._socket         = options.socket || dgram.createSocket('udp4');
  this._port           = options.port || constants.ports.NAVDATA;
  this._ip             = options.ip || constants.DEFAULT_DRONE_IP;
  this._initialized    = false;
  this._parseNavdata   = options.parser || parseNavdata;
  this._timeout        = options.timeout || 100;
  this._timer          = undefined;
  this._sequenceNumber = 0;
}

UdpNavdataStream.prototype.resume = function() {
  if (!this._initialized) {
    this._init();
    this._initialized = true;
  }

  this._requestNavdata();
};

UdpNavdataStream.prototype.destroy = function() {
  this._socket.close();
};

UdpNavdataStream.prototype._init = function() {
  this._socket.bind();
  this._socket.on('message', this._handleMessage.bind(this));
};

UdpNavdataStream.prototype._requestNavdata = function() {
  var buffer = new Buffer([1]);
  this._socket.send(buffer, 0, buffer.length, this._port, this._ip);

  this._setTimeout();

  // @TODO logging
};

UdpNavdataStream.prototype._setTimeout = function() {
  clearTimeout(this._timer);
  this._timer = setTimeout(this._requestNavdata.bind(this), this._timeout);
};

UdpNavdataStream.prototype._handleMessage = function(buffer) {
  var navdata = {};

  try {
    navdata = this._parseNavdata(buffer);
  } catch (err) {
    // avoid 'error' causing an exception when nobody is listening
    if (this.listeners('error').length > 0) {
      this.emit('error', err);
    }
    return;
  }

  // Ignore out of order messages
  if (navdata.sequenceNumber > this._sequenceNumber) {
    this._sequenceNumber = navdata.sequenceNumber;
    this.emit('data', navdata);
  }

  this._setTimeout();
};

}).call(this,require("buffer").Buffer)
},{"../constants":30,"./parseNavdata":38,"buffer":75,"dgram":72,"stream":96,"util":99}],38:[function(require,module,exports){
var NavdataReader = require('./NavdataReader');

// call `iterator` `n` times, returning an array of the results
var timesMap = function(n, iterator, context) {
  var results = [];
  for (var i = 0; i < n; i++) {
    results[i] = iterator.call(context, i);
  }
  return results;
};

var droneTimeToMilliSeconds = function (time) {
  // first 11 bits are seconds
  var seconds = time >>> 21;
  // last 21 bits are microseconds
  var microseconds = (time << 11) >>> 11;

  // Convert to ms (which is idiomatic for time in JS)
  return seconds * 1000 + microseconds / 1000;
};

var exports = module.exports = function parseNavdata(buffer) {
  var reader = new NavdataReader(buffer);

  var navdata = {};

  navdata.header = reader.uint32();
  if (navdata.header !== exports.NAVDATA_HEADER1 &&
     navdata.header !== exports.NAVDATA_HEADER2) {
    throw new Error('Invalid header: 0x' + navdata.header.toString(16));
  }

  navdata.droneState     = reader.mask32(exports.DRONE_STATES);
  navdata.sequenceNumber = reader.uint32();
  navdata.visionFlag     = reader.uint32();

  while (true) {
    var optionId   = reader.uint16();
    var optionName = exports.OPTION_IDS[optionId];
    var length     = reader.uint16();

    // length includes header size (4 bytes)
    var optionReader = new NavdataReader(reader.buffer(length - 4));

    if (optionName == 'checksum') {
      var expectedChecksum = 0;
      for (var i = 0; i < buffer.length - length; i++) {
        expectedChecksum += buffer[i];
      }

      var checksum = optionReader.uint32();

      if (checksum !== expectedChecksum) {
        throw new Error('Invalid checksum, expected: ' + expectedChecksum + ', got: ' + checksum);
      }

      // checksum is the last option
      break;
    }

    // parse option according to  ARDrone_SDK_2_0/ARDroneLib/Soft/Common/navdata_common.h)
    navdata[optionName] = (exports.OPTION_PARSERS[optionName])
      ? exports.OPTION_PARSERS[optionName](optionReader)
      : new Error('Option not implemented yet: ' + optionName + ' (0x' + optionId.toString(16) + ')');
  }

  return navdata;
};

exports.OPTION_PARSERS = {
  'demo': function(reader) {
    // simplified version of ctrl_state_str (in ARDrone_SDK_2_0/Examples/Linux/Navigation/Sources/navdata_client/navdata_ihm.c)
    var flyState          = exports.FLY_STATES[reader.uint16()];
    var controlState      = exports.CONTROL_STATES[reader.uint16()];
    var batteryPercentage = reader.uint32();
    var theta             = reader.float32() / 1000; // [mdeg]
    var phi               = reader.float32() / 1000; // [mdeg]
    var psi               = reader.float32() / 1000; // [mdeg]
    var altitude          = reader.int32()   / 1000; // [mm]
    var velocity          = reader.vector31(); // [mm/s]
    var frameIndex = reader.uint32();
    var detection = {
      camera: {
        rotation    : reader.matrix33(),
        translation : reader.vector31()
      },
      tagIndex: reader.uint32()
    };
    detection.camera.type = reader.uint32();
    var drone = {
      camera: {
        rotation    : reader.matrix33(),
        translation : reader.vector31()
      }
    };
    var rotation = {
      frontBack : theta,
      pitch     : theta,
      theta     : theta,
      y         : theta,
      leftRight : phi,
      roll      : phi,
      phi       : phi,
      x         : phi,
      clockwise : psi,
      yaw       : psi,
      psi       : psi,
      z         : psi
    };

    return {
      controlState      : controlState,
      flyState          : flyState,
      batteryPercentage : batteryPercentage,
      rotation          : rotation,
      frontBackDegrees  : theta,
      leftRightDegrees  : phi,
      clockwiseDegrees  : psi,
      altitude          : altitude,
      altitudeMeters    : altitude,
      velocity          : velocity,
      xVelocity         : velocity.x,
      yVelocity         : velocity.y,
      zVelocity         : velocity.z,
      frameIndex        : frameIndex,
      detection         : detection,
      drone             : drone
    };
  },

  'time': function(reader) {
    var time = reader.uint32();
    return droneTimeToMilliSeconds(time);
  },

  'rawMeasures': function(reader) {
    var accelerometers = {
      x: reader.uint16(), // [LSB]
      y: reader.uint16(), // [LSB]
      z: reader.uint16()  // [LSB]
    };
    var gyroscopes = {
      x: reader.int16(), // [LSB]
      y: reader.int16(), // [LSB]
      z: reader.int16()  // [LSB]
    };
    // gyroscopes  x/y 110 deg/s (@TODO figure out what that means)
    var gyroscopes110 = {
      x: reader.int16(), // [LSB]
      y: reader.int16()  // [LSB]
    };
    var batteryMilliVolt = reader.uint32(); // [mV]
    // no idea what any of those are
    var usEcho = {
      start       : reader.uint16(), // [LSB]
      end         : reader.uint16(), // [LSB]
      association : reader.uint16(), // [LSB?]
      distance    : reader.uint16()  // [LSB]
    };
    var usCurve = {
      time  : reader.uint16(), // [LSB]
      value : reader.uint16(), // [LSB]
      ref   : reader.uint16()  // [LSB]
    };
    var echo = {
      flagIni : reader.uint16(), // [LSB]
      num     : reader.uint16(), // [LSB] (is key `num` OR `name`?)
      sum     : reader.uint32()  // [LSB]
    };
    var altTemp  = reader.int32(); // [mm]

    return {
      accelerometers    : accelerometers,
      gyroscopes        : gyroscopes,
      gyrometers        : gyroscopes,
      gyroscopes110     : gyroscopes110,
      gyrometers110     : [gyroscopes110.x, gyroscopes110.y],
      batteryMilliVolt  : batteryMilliVolt,
      us                : {echo: usEcho, curve: usCurve},
      usDebutEcho       : usEcho.start,
      usFinEcho         : usEcho.end,
      usAssociationEcho : usEcho.association,
      usDistanceEcho    : usEcho.distance,
      usCourbeTemps     : usCurve.time,
      usCourbeValeur    : usCurve.value,
      usCourbeRef       : usCurve.ref,
      echo              : echo,
      flagEchoIni       : echo.flagIni,
      nbEcho            : echo.num,
      sumEcho           : echo.sum,
      altTemp           : altTemp,
      altTempRaw        : altTemp
    };
  },

  'physMeasures': function(reader) {
    return {
      temperature: {
        accelerometer: reader.float32(), // [K]
        gyroscope: reader.uint16()  // [LSB]
      },
      accelerometers : reader.vector31(), // [mg]
      gyroscopes     : reader.vector31(), // [deg/s]
      alim3V3        : reader.uint32(), // [LSB]
      vrefEpson      : reader.uint32(), // [LSB]
      vrefIDG        : reader.uint32()  // [LSB]
    };
  },

  'gyrosOffsets': function(reader) {
    return reader.vector31();  // [LSB]
  },

  'eulerAngles': function(reader) {
    return {
      theta : reader.float32(), // [mdeg?]
      phi   : reader.float32()  // [mdeg?]
    };
  },

  'references': function(reader) {
    return {
      theta    : reader.int32(), // [mdeg]
      phi      : reader.int32(), // [mdeg]
      thetaI   : reader.int32(), // [mdeg]
      phiI     : reader.int32(), // [mdeg]
      pitch    : reader.int32(), // [mdeg]
      roll     : reader.int32(), // [mdeg]
      yaw      : reader.int32(), // [mdeg/s]
      psi      : reader.int32(), // [mdeg]

      vx       : reader.float32(),
      vy       : reader.float32(),
      thetaMod : reader.float32(),
      phiMod   : reader.float32(),

      kVX      : reader.float32(),
      kVY      : reader.float32(),
      kMode    : reader.uint32(),

      ui       : {
        time        : reader.float32(),
        theta       : reader.float32(),
        phi         : reader.float32(),
        psi         : reader.float32(),
        psiAccuracy : reader.float32(),
        seq         : reader.int32()
      }
    };
  },

  'trims': function(reader) {
    return {
      angularRates : {
        r : reader.float32()
      },
      eulerAngles : {
        theta : reader.float32(), // [mdeg?]
        phi   : reader.float32()  // [mdeg?]
      }
    };
  },

  'rcReferences': function(reader) {
    return {
      pitch : reader.int32(), // [mdeg?]
      roll  : reader.int32(), // [mdeg?]
      yaw   : reader.int32(), // [mdeg/s?]
      gaz   : reader.int32(),
      ag    : reader.int32()
    };
  },

  'pwm': function(reader) {
    return {
      motors           : timesMap(4, reader.uint8, reader), // [PWM]
      satMotors        : timesMap(4, reader.uint8, reader), // [PWM]
      gazFeedForward   : reader.float32(), // [PWM]
      gazAltitude      : reader.float32(), // [PWM]
      altitudeIntegral : reader.float32(), // [mm/s]
      vzRef            : reader.float32(), // [mm/s]
      uPitch           : reader.int32(), // [PWM]
      uRoll            : reader.int32(), // [PWM]
      uYaw             : reader.int32(), // [PWM]
      yawUI            : reader.float32(), // [PWM] yaw_u_I
      uPitchPlanif     : reader.int32(), // [PWM]
      uRollPlanif      : reader.int32(), // [PWM]
      uYawPlanif       : reader.int32(), // [PWM]
      uGazPlanif       : reader.float32(), // [PWM]
      motorCurrents    : timesMap(4, reader.uint16, reader), // [mA]
      altitudeProp     : reader.float32(), // [PWM]
      altitudeDer      : reader.float32()  // [PWM]
    };
  },

  'altitude': function(reader) {
    return {
      vision   : reader.int32(),   // [mm]
      velocity : reader.float32(), // [mm/s]
      ref      : reader.int32(),   // [mm]
      raw      : reader.int32(),   // [mm]
      observer : {
        acceleration : reader.float32(), // [m/s2]
        altitude     : reader.float32(), // [m]
        x            : reader.vector31(),
        state        : reader.uint32()
      },
      estimated : {
        vb    : {
          x : reader.float32(),
          y : reader.float32()
        },
        state : reader.uint32()
      }
    };
  },

  'visionRaw': function(reader) {
    return {
      tx : reader.float32(),
      ty : reader.float32(),
      tz : reader.float32()
    };
  },

  'visionOf': function(reader) {
    return {
      dx : timesMap(5, reader.float32, reader),
      dy : timesMap(5, reader.float32, reader)
    };
  },

  'vision': function(reader) {
    return {
      state         : reader.uint32(),
      misc          : reader.int32(),
      phi: {
        trim       : reader.float32(), // [rad]
        refProp    : reader.float32()  // [rad]
      },
      theta: {
        trim     : reader.float32(), // [rad]
        refProp  : reader.float32()  // [rad]
      },
      newRawPicture : reader.int32(),
      capture       : {
        theta    : reader.float32(),
        phi      : reader.float32(),
        psi      : reader.float32(),
        altitude : reader.int32(),
        time     : droneTimeToMilliSeconds(reader.uint32())
      },
      bodyV         : reader.vector31(), // [mm/s]
      delta         : {
        phi   : reader.float32(),
        theta : reader.float32(),
        psi   : reader.float32()
      },
      gold          : {
        defined : reader.uint32(),
        reset   : reader.uint32(),
        x       : reader.float32(),
        y       : reader.float32()
      }
    };
  },

  'visionPerf': function(reader) {
    return {
      szo      : reader.float32(),
      corners  : reader.float32(),
      compute  : reader.float32(),
      tracking : reader.float32(),
      trans    : reader.float32(),
      update   : reader.float32(),
      custom   : timesMap(20, reader.float32, reader)
    };
  },

  'trackersSend': function(reader) {
    return {
      locked : timesMap(30, reader.int32, reader),
      point  : timesMap(30, reader.screenPoint, reader)
    };
  },

  'visionDetect': function(reader) {
    return {
      nbDetected       : reader.uint32(),
      type             : timesMap(4, reader.uint32, reader),
      xc               : timesMap(4, reader.uint32, reader),
      yc               : timesMap(4, reader.uint32, reader),
      width            : timesMap(4, reader.uint32, reader),
      height           : timesMap(4, reader.uint32, reader),
      dist             : timesMap(4, reader.uint32, reader),
      orientationAngle : timesMap(4, reader.float32, reader),
      rotation         : timesMap(4, reader.matrix33, reader),
      translation      : timesMap(4, reader.vector31, reader),
      cameraSource     : timesMap(4, reader.uint32, reader)
    };
  },

  'watchdog': function(reader) {
    return reader.uint32();
  },

  'adcDataFrame': function(reader) {
    return {
      version   : reader.uint32(),
      dataFrame : timesMap(32, reader.uint8, reader)
    };
  },

  'videoStream': function(reader) {
    return {
      quant          : reader.uint8(),
      frame          : {
        size   : reader.uint32(), // [bytes]
        number : reader.uint32()
      },
      atcmd          : {
        sequence : reader.uint32(),
        meanGap  : reader.uint32(), // [ms]
        varGap   : reader.float32(), // [SU]
        quality  : reader.uint32()
      },
      bitrate        : {
        out     : reader.uint32(),
        desired : reader.uint32()
      },
      data           : timesMap(5, reader.int32, reader),
      tcpQueueLevel  : reader.uint32(),
      fifoQueueLevel : reader.uint32()
    };
  },

  'games': function(reader) {
    return {
      counters: {
        doubleTap  : reader.uint32(),
        finishLine : reader.uint32()
      }
    };
  },

  'pressureRaw': function(reader) {
    return {
      up          : reader.int32(), // [LSB] (UP?)
      ut          : reader.int16(), // [LSB] (UT?)
      temperature : reader.int32(), // [0_1C]
      pressure    : reader.int32()  // [Pa]
    };
  },

  'magneto': function(reader) {
    return {
      mx        : reader.int16(), // [LSB]
      my        : reader.int16(), // [LSB]
      mz        : reader.int16(), // [LSB]
      raw       : reader.vector31(), // [mG]
      rectified : reader.vector31(), // [mG]
      offset    : reader.vector31(), // [mG]
      heading   : {
        unwrapped: reader.float32(), // [deg]
        gyroUnwrapped: reader.float32(), // [deg]
        fusionUnwrapped: reader.float32() // [mdeg]
      },
      ok     : reader.char(),
      state  : reader.uint32(), // [SU]
      radius : reader.float32(), // [mG]
      error  : {
        mean     : reader.float32(), // [mG]
        variance : reader.float32()  // [mG2]
      }
    };
  },

  'windSpeed': function(reader) {
    return {
      speed: reader.float32(), // [m/s]
      angle: reader.float32(), // [deg]
      compensation: {
        theta: reader.float32(), // [rad]
        phi: reader.float32()
      },
      stateX: timesMap(6, reader.float32, reader), // [SU]
      debug: timesMap(3, reader.float32, reader)
    };
  },

  'kalmanPressure': function(reader) {
    return {
      offsetPressure: reader.float32(), // [Pa]
      estimated: {
        altitude: reader.float32(), // [mm]
        velocity: reader.float32(), // [m/s]
        angle: {
          pwm: reader.float32(), // [m/s2]
          pressure: reader.float32() // [Pa]
        },
        us: {
          offset: reader.float32(), // [m]
          prediction: reader.float32() // [mm]
        },
        covariance: {
          alt: reader.float32(), // [m]
          pwm: reader.float32(),
          velocity: reader.float32() // [m/s]
        },
        groundEffect: reader.bool(), // [SU]
        sum: reader.float32(), // [mm]
        reject: reader.bool(), // [SU]
        uMultisinus: reader.float32(),
        gazAltitude: reader.float32(),
        flagMultisinus: reader.bool(),
        flagMultisinusStart: reader.bool()
      }
    };
  },

  'hdvideoStream': function(reader) {
    var values = {
      hdvideoState : reader.uint32(),
      storageFifo  : {
        nbPackets : reader.uint32(),
        size      : reader.uint32()
      },
      usbkey       : {
        size      : reader.uint32(),
        freespace : reader.uint32()
      },
      frameNumber  : reader.uint32()
    };
    values.usbkey.remainingTime = reader.uint32();

    return values;
  },

  'wifi': function(reader) {
    return {
      // from ARDrone_SDK_2_0/ControlEngine/iPhone/Classes/Controllers/MainViewController.m
      linkQuality: (1 - (reader.float32()))
    };
  },

  'gps': function(reader) {
    return {
      // from https://github.com/lesire/ardrone_autonomy/commit/a986b3380da8d9306407e2ebfe7e0f2cd5f97683
      latitude:             reader.double64(),
      longitude:            reader.double64(),
      elevation:            reader.double64(),
      hdop:                 reader.double64(),
      dataAvailable:        reader.int32(),
      zeroValidated:        reader.int32(),
      wptValidated:         reader.int32(),
      lat0:                 reader.double64(),
      lon0:                 reader.double64(),
      latFuse:              reader.double64(),
      lonFuse:              reader.double64(),
      gpsState:             reader.uint32(),
      xTraj:                reader.float32(),
      xRef:                 reader.float32(),
      yTraj:                reader.float32(),
      yRef:                 reader.float32(),
      thetaP:               reader.float32(),
      phiP:                 reader.float32(),
      thetaI:               reader.float32(),
      phiI:                 reader.float32(),
      thetaD:               reader.float32(),
      phiD:                 reader.float32(),
      vdop:                 reader.double64(),
      pdop:                 reader.double64(),
      speed:                reader.float32(),
      lastFrameTimestamp:   droneTimeToMilliSeconds(reader.uint32()),
      degree:               reader.float32(),
      degreeMag:            reader.float32(),
      ehpe:                 reader.float32(),
      ehve:                 reader.float32(),
      c_n0:                 reader.float32(),
      nbSatellites:         reader.uint32(),
      channels:             timesMap(12, reader.satChannel, reader),
      gpsPlugged:           reader.int32(),
      ephemerisStatus:      reader.uint32(),
      vxTraj:               reader.float32(),
      vyTraj:               reader.float32(),
      firmwareStatus:       reader.uint32()
    };
  }
};


// Constants

exports.NAVDATA_HEADER1 = 0x55667788;
exports.NAVDATA_HEADER2 = 0x55667789;

// from ARDrone_SDK_2_0/ARDroneLib/Soft/Common/config.h
exports.DRONE_STATES = {
  flying                     : 1 << 0,  /*!< FLY MASK : (0) ardrone is landed, (1) ardrone is flying */
  videoEnabled               : 1 << 1,  /*!< VIDEO MASK : (0) video disable, (1) video enable */
  visionEnabled              : 1 << 2,  /*!< VISION MASK : (0) vision disable, (1) vision enable */
  controlAlgorithm           : 1 << 3,  /*!< CONTROL ALGO : (0) euler angles control, (1) angular speed control */
  altitudeControlAlgorithm   : 1 << 4,  /*!< ALTITUDE CONTROL ALGO : (0) altitude control inactive (1) altitude control active */
  startButtonState           : 1 << 5,  /*!< USER feedback : Start button state */
  controlCommandAck          : 1 << 6,  /*!< Control command ACK : (0) None, (1) one received */
  cameraReady                : 1 << 7,  /*!< CAMERA MASK : (0) camera not ready, (1) Camera ready */
  travellingEnabled          : 1 << 8,  /*!< Travelling mask : (0) disable, (1) enable */
  usbReady                   : 1 << 9,  /*!< USB key : (0) usb key not ready, (1) usb key ready */
  navdataDemo                : 1 << 10, /*!< Navdata demo : (0) All navdata, (1) only navdata demo */
  navdataBootstrap           : 1 << 11, /*!< Navdata bootstrap : (0) options sent in all or demo mode, (1) no navdata options sent */
  motorProblem               : 1 << 12, /*!< Motors status : (0) Ok, (1) Motors problem */
  communicationLost          : 1 << 13, /*!< Communication Lost : (1) com problem, (0) Com is ok */
  softwareFault              : 1 << 14, /*!< Software fault detected - user should land as quick as possible (1) */
  lowBattery                 : 1 << 15, /*!< VBat low : (1) too low, (0) Ok */
  userEmergencyLanding       : 1 << 16, /*!< User Emergency Landing : (1) User EL is ON, (0) User EL is OFF*/
  timerElapsed               : 1 << 17, /*!< Timer elapsed : (1) elapsed, (0) not elapsed */
  MagnometerNeedsCalibration : 1 << 18, /*!< Magnetometer calibration state : (0) Ok, no calibration needed, (1) not ok, calibration needed */
  anglesOutOfRange           : 1 << 19, /*!< Angles : (0) Ok, (1) out of range */
  tooMuchWind                : 1 << 20, /*!< WIND MASK: (0) ok, (1) Too much wind */
  ultrasonicSensorDeaf       : 1 << 21, /*!< Ultrasonic sensor : (0) Ok, (1) deaf */
  cutoutDetected             : 1 << 22, /*!< Cutout system detection : (0) Not detected, (1) detected */
  picVersionNumberOk         : 1 << 23, /*!< PIC Version number OK : (0) a bad version number, (1) version number is OK */
  atCodecThreadOn            : 1 << 24, /*!< ATCodec thread ON : (0) thread OFF (1) thread ON */
  navdataThreadOn            : 1 << 25, /*!< Navdata thread ON : (0) thread OFF (1) thread ON */
  videoThreadOn              : 1 << 26, /*!< Video thread ON : (0) thread OFF (1) thread ON */
  acquisitionThreadOn        : 1 << 27, /*!< Acquisition thread ON : (0) thread OFF (1) thread ON */
  controlWatchdogDelay       : 1 << 28, /*!< CTRL watchdog : (1) delay in control execution (> 5ms), (0) control is well scheduled */
  adcWatchdogDelay           : 1 << 29, /*!< ADC Watchdog : (1) delay in uart2 dsr (> 5ms), (0) uart2 is good */
  comWatchdogProblem         : 1 << 30, /*!< Communication Watchdog : (1) com problem, (0) Com is ok */
  emergencyLanding           : 1 << 31  /*!< Emergency landing : (0) no emergency, (1) emergency */
};

exports.OPTION_IDS = {
  0     : 'demo',
  1     : 'time',
  2     : 'rawMeasures',
  3     : 'physMeasures',
  4     : 'gyrosOffsets',
  5     : 'eulerAngles',
  6     : 'references',
  7     : 'trims',
  8     : 'rcReferences',
  9     : 'pwm',
  10    : 'altitude',
  11    : 'visionRaw',
  12    : 'visionOf',
  13    : 'vision',
  14    : 'visionPerf',
  15    : 'trackersSend',
  16    : 'visionDetect',
  17    : 'watchdog',
  18    : 'adcDataFrame',
  19    : 'videoStream',
  20    : 'games',
  21    : 'pressureRaw',
  22    : 'magneto',
  23    : 'windSpeed',
  24    : 'kalmanPressure',
  25    : 'hdvideoStream',
  26    : 'wifi',
  27    : 'gps',
  65535 : 'checksum'
};

exports.CONTROL_STATES = {
  0: 'CTRL_DEFAULT',
  1: 'CTRL_INIT',
  2: 'CTRL_LANDED',
  3: 'CTRL_FLYING',
  4: 'CTRL_HOVERING',
  5: 'CTRL_TEST',
  6: 'CTRL_TRANS_TAKEOFF',
  7: 'CTRL_TRANS_GOTOFIX',
  8: 'CTRL_TRANS_LANDING',
  9: 'CTRL_TRANS_LOOPING'
};

exports.FLY_STATES = {
  0: 'FLYING_OK',
  1: 'FLYING_LOST_ALT',
  2: 'FLYING_LOST_ALT_GO_DOWN',
  3: 'FLYING_ALT_OUT_ZONE',
  4: 'FLYING_COMBINED_YAW',
  5: 'FLYING_BRAKE',
  6: 'FLYING_NO_VISION'
};

},{"./NavdataReader":36}],39:[function(require,module,exports){
// Converts a video stream into a stream of png buffers. Each 'data' event
// is guaranteed to contain exactly 1 png image.

// @TODO handle ffmpeg exit (and trigger "error" if unexpected)

var Stream      = require('stream').Stream;
var util        = require('util');
var spawn       = require('child_process').spawn;
var PngSplitter = require('./PngSplitter');

module.exports = PngEncoder;
util.inherits(PngEncoder, Stream);
function PngEncoder(options) {
  Stream.call(this);

  options = options || {};

  this.writable = true;
  this.readable = true;

  this._spawn       = options.spawn || spawn;
  this._imageSize   = options.imageSize || null;
  this._frameRate   = options.frameRate || 5;
  this._pngSplitter = options.pngSplitter || new PngSplitter();
  this._log         = options.log;
  this._ffmpeg      = undefined;
  this._ending      = false;
}

PngEncoder.prototype.write = function(buffer) {
  if (!this._ffmpeg) {
    this._initFfmpegAndPipes();
  }

  return this._ffmpeg.stdin.write(buffer);
};

PngEncoder.prototype._initFfmpegAndPipes = function() {
  this._ffmpeg = this._spawnFfmpeg();

  // @TODO: Make this more sophisticated for somehow and figure out how it
  // will work with the planned new data recording system.
  if (this._log) {
    this._ffmpeg.stderr.pipe(this._log);
  }

  this._ffmpeg.stdout.pipe(this._pngSplitter);
  this._pngSplitter.on('data', this.emit.bind(this, 'data'));

  // 'error' can be EPIPE if ffmpeg does not exist. We handle this with the
  // 'exit' event below.
  this._ffmpeg.stdin.on('error', function() {});

  this._ffmpeg.stdin.on('drain', this.emit.bind(this, 'drain'));

  var self = this;
  // Since node 0.10, spawn emits 'error' when the child can't be spawned.
  // http://nodejs.org/api/child_process.html#child_process_event_error
  this._ffmpeg.on('error', function(err) {
    if (err.code === 'ENOENT') {
      self.emit('error', new Error('Ffmpeg was not found. Have you installed the ffmpeg package?'));
    } else {
      self.emit('error', new Error('Unexpected error when launching ffmpeg:' + err.toString()));
    }
  });

  this._ffmpeg.on('exit', function(code) {
    if (code === 0) {
      // we expected ffmpeg to exit
      if (self._ending) {
        self.emit('end');
        return;
      }

      self.emit('error', new Error('Unexpected ffmpeg exit with code 0.'));
      return;
    }

    // 127 is used by the OS to indicate that ffmpeg was not found
    // required when using node < 0.10
    if (code === 127) {
      self.emit('error', new Error('Ffmpeg was not found / exit code 127.'));
      return;
    }

    self.emit('error', new Error('Ffmpeg exited with error code: ' + code));
  });
};

PngEncoder.prototype._spawnFfmpeg = function() {
  var ffmpegOptions = [];
  ffmpegOptions.push('-i', '-'); // input flag
  ffmpegOptions.push('-f', 'image2pipe'); // format flag
  if(this._imageSize){
    ffmpegOptions.push('-s', this._imageSize); // size flag
  }
  ffmpegOptions.push('-vcodec', 'png'); // codec flag
  ffmpegOptions.push('-r', this._frameRate); // framerate flag
  ffmpegOptions.push('-'); // output
  // @TODO allow people to configure the ffmpeg path
  return this._spawn('ffmpeg', ffmpegOptions);
};

PngEncoder.prototype.end = function() {
  // No data handled yet? Nothing to do for ending.
  if (!this._ffmpeg) {
    return;
  }

  this._ending = true;
  this._ffmpeg.stdin.end();
};

},{"./PngSplitter":40,"child_process":72,"stream":96,"util":99}],40:[function(require,module,exports){
(function (Buffer){
var EventEmitter = require('events').EventEmitter;
var util         = require('util');

module.exports = PngSplitter;
util.inherits(PngSplitter, EventEmitter);
function PngSplitter() {
  EventEmitter.call(this);

  this.writable        = true;
  this._buffer         = new Buffer(0);
  this._offset         = 0;
  this._pngStartOffset = null;
  this._state          = 'header';
  this._chunk          = null;
}

PngSplitter.prototype.write = function(buffer) {
  this._buffer = Buffer.concat([this._buffer, buffer]);

  while (true) {
    switch (this._state) {
      case 'header':
        this._pngStartOffset = this._offset;

        if (this.remainingBytes() < 8) {
          return;
        }

        this._offset += 8;
        this._state = 'chunk.header';
        break;
      case 'chunk.header':
        if (this.remainingBytes() < 8) {
          return;
        }

        this._chunk = {
          length : this.unsignedNumber(4),
          type   : this.array(4).join(' '),
        };

        this._state = 'chunk.data';
        break;
      case 'chunk.data':
        var chunkSize = this._chunk.length + 4; // 4 bytes = CRC
        if (this.remainingBytes() < chunkSize) {
          return;
        }

        this._offset += chunkSize;

        // IEND chunk
        if (this._chunk.type == '73 69 78 68') {
          var png = this._buffer.slice(this._pngStartOffset, this._offset);
          this.emit('data', png);

          this._buffer = this._buffer.slice(this._offset);
          this._offset = 0;
          this._state  = 'header';
          break;
        }

        this._state = 'chunk.header';
        break;
    }
  }

  return true;
};

PngSplitter.prototype.remainingBytes = function() {
  return this._buffer.length - this._offset;
};

PngSplitter.prototype.array = function(bytes) {
  var array = [];

  for (var i = 0; i < bytes; i++) {
    array.push(this._buffer[this._offset++]);
  }

  return array;
};

PngSplitter.prototype.unsignedNumber = function(bytes) {
  var bytesRead = 0;
  var value     = 0;

  while (bytesRead < bytes) {
    var byte = this._buffer[this._offset++];

    value += byte * Math.pow(256, bytes - bytesRead - 1);

    bytesRead++;
  }

  return value;
};

PngSplitter.prototype.end = function() {
};

}).call(this,require("buffer").Buffer)
},{"buffer":75,"events":81,"util":99}],41:[function(require,module,exports){
PngStream.TcpVideoStream = require('./TcpVideoStream');
PngStream.PngEncoder = require('./PngEncoder');

var Stream     = require('stream').Stream;
var util       = require('util');

module.exports = PngStream;
util.inherits(PngStream, Stream);
function PngStream(options) {
  console.warn('The PngStream class is deprecated. Use client.getPngStream() instead.');
  Stream.call(this);

  options = options || {};

  this.readable        = true;
  this._options        = options;
  this._tcpVideoStream = null;
  this._pngEncoder     = null;
}

PngStream.prototype.resume = function() {
  this._resume();
};

PngStream.prototype._resume = function() {
  var self = this;

  this._tcpVideoStream = new PngStream.TcpVideoStream(this._options);
  this._pngEncoder     = new PngStream.PngEncoder(this._options);

  this._tcpVideoStream.on('error', function(err) {
    self._pngEncoder.end();
    self._resume();

    if (self.listeners('error').length > 0) {
      self.emit('error', err);
    }
  });

  this._tcpVideoStream.connect();
  this._tcpVideoStream.pipe(this._pngEncoder);
  this._pngEncoder.on('data', this.emit.bind(this, 'data'));
  this._pngEncoder.on('error', this.emit.bind(this, 'error'));
};

},{"./PngEncoder":39,"./TcpVideoStream":42,"stream":96,"util":99}],42:[function(require,module,exports){
var Stream    = require('stream').Stream;
var util      = require('util');
var net       = require('net');
var constants = require('../constants');

module.exports = TcpVideoStream;
util.inherits(TcpVideoStream, Stream);
function TcpVideoStream(options) {
  Stream.call(this);

  options = options || {};

  this.readable   = true;
  this._socket    = options.socket || new net.Socket();
  this._port      = options.port || constants.ports.VIDEO;
  this._ip        = options.ip || constants.DEFAULT_DRONE_IP;
  this._timeout   = options.timeout || 1 * 1000;
  this._expectFIN = false;
}

TcpVideoStream.prototype.connect = function(cb) {
  cb = cb || function() {};

  this._socket.removeAllListeners();                // To avoid duplicates when re-connecting
  this._socket.connect(this._port, this._ip);
  this._socket.setTimeout(this._timeout);

  var self = this;
  this._socket
    .on('connect', function() {
      self._socket.removeListener('error', cb);
      self._socket.on('error', function(err) {
        self.emit('error', err);
      });
      cb(null);
    })
    .on('data', function(buffer) {
      self.emit('data', buffer);
    })
    .on('timeout', function() {
      var err = new Error('TcpVideoStream timeout after ' + self._timeout + ' ms.');
      self.emit('error', err);
      self.emit('close', err);
      self._socket.destroy();
    })
    .on('error', cb)
    .on('end', function() {
      if (self._expectFIN) {
        self.emit('close');
        return;
      }

      var err = new Error('TcpVideoStream received FIN unexpectedly.');
      self.emit('error', err);
      self.emit('close', err);
    });

};

TcpVideoStream.prototype.end = function() {
  this._expectFIN = true;
  this._socket.end();
};

},{"../constants":30,"net":72,"stream":96,"util":99}],43:[function(require,module,exports){
var buffy = exports;

buffy.Reader = require('./lib/Reader');
buffy.createReader = function(options) {
  return new buffy.Reader(options);
};

},{"./lib/Reader":44}],44:[function(require,module,exports){
(function (Buffer){
var util         = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = Reader;
util.inherits(Reader, EventEmitter);
function Reader(options) {
  EventEmitter.call(this);

  if (Buffer.isBuffer(options)) {
    options = {buffer: options};
  }

  options = options || {};

  this.writable = true;

  this._buffer = options.buffer || new Buffer(0);
  this._offset = options.offset || 0;
  this._paused = false;
}

Reader.prototype.write = function(newBuffer) {
  var bytesAhead = this.bytesAhead();

  // existing buffer has enough space in the beginning?
  var reuseBuffer = (this._offset >= newBuffer.length);

  if (reuseBuffer) {
    // move unread bytes forward to make room for the new
    this._buffer.copy(this._buffer, this._offset - newBuffer.length, this._offset);
    this._offset -= newBuffer.length;

    // add the new bytes at the end
    newBuffer.copy(this._buffer, this._buffer.length - newBuffer.length);
  } else {
    var oldBuffer = this._buffer;

    // grow a new buffer that can hold both
    this._buffer = new Buffer(bytesAhead + newBuffer.length);

    // copy the old and new buffer into it
    oldBuffer.copy(this._buffer, 0, this._offset);
    newBuffer.copy(this._buffer, bytesAhead);
    this._offset = 0;
  }

  return !this._paused;
};

Reader.prototype.pause = function() {
  this._paused = true;
};

Reader.prototype.resume = function() {
  this._paused = false;
};

Reader.prototype.bytesAhead = function() {
  return this._buffer.length - this._offset;
};

Reader.prototype.bytesBuffered = function() {
  return this._buffer.length;
};

Reader.prototype.uint8 = function() {
  return this._buffer.readUInt8(this._offset++);
};

Reader.prototype.int8 = function() {
  return this._buffer.readInt8(this._offset++);
};

Reader.prototype.uint16BE = function() {
  this._offset += 2;
  return this._buffer.readUInt16BE(this._offset - 2);
};

Reader.prototype.int16BE = function() {
  this._offset += 2;
  return this._buffer.readInt16BE(this._offset - 2);
};

Reader.prototype.uint16LE = function() {
  this._offset += 2;
  return this._buffer.readUInt16LE(this._offset - 2);
};

Reader.prototype.int16LE = function() {
  this._offset += 2;
  return this._buffer.readInt16LE(this._offset - 2);
};

Reader.prototype.uint32BE = function() {
  this._offset += 4;
  return this._buffer.readUInt32BE(this._offset - 4);
};

Reader.prototype.int32BE = function() {
  this._offset += 4;
  return this._buffer.readInt32BE(this._offset - 4);
};

Reader.prototype.uint32LE = function() {
  this._offset += 4;
  return this._buffer.readUInt32LE(this._offset - 4);
};

Reader.prototype.int32LE = function() {
  this._offset += 4;
  return this._buffer.readInt32LE(this._offset - 4);
};

Reader.prototype.float32BE = function() {
  this._offset += 4;
  return this._buffer.readFloatBE(this._offset - 4);
};

Reader.prototype.float32LE = function() {
  this._offset += 4;
  return this._buffer.readFloatLE(this._offset - 4);
};

Reader.prototype.double64BE = function() {
  this._offset += 8;
  return this._buffer.readDoubleBE(this._offset - 8);
};

Reader.prototype.double64LE = function() {
  this._offset += 8;
  return this._buffer.readDoubleLE(this._offset - 8);
};

Reader.prototype.ascii = function(bytes) {
  return this._string('ascii', bytes);
};

Reader.prototype.utf8 = function(bytes) {
  return this._string('utf8', bytes);
};

Reader.prototype._string = function(encoding, bytes) {
  var nullTerminated = (bytes === undefined);
  if (nullTerminated) {
    bytes = this._nullDistance();
  }

  var offset = this._offset;
  this._offset += bytes;

  var value = this._buffer.toString(encoding, offset, this._offset);

  if (nullTerminated) {
    this._offset++;
  }

  return value;
};

Reader.prototype._nullDistance = function() {
  for (var i = this._offset; i < this._buffer.length; i++) {
    var byte = this._buffer[i];
    if (byte === 0) {
      return i - this._offset;
    }
  }
};

Reader.prototype.buffer = function(bytes) {
  this._offset += bytes;
  var ret = new Buffer(bytes);
  this._buffer.copy(ret, 0, this._offset -  bytes, this._offset);
  return ret;
};

Reader.prototype.skip = function(bytes) {
    if (bytes > this.bytesAhead() || bytes < 0) {
        this.emit('error', new Error('tried to skip outsite of the buffer'));
    }
    this._offset += bytes;
};

}).call(this,require("buffer").Buffer)
},{"buffer":75,"events":81,"util":99}],45:[function(require,module,exports){
(function (process){
/**
 * Module dependencies.
 */

var console = require('console');

exports = module.exports = debug;


/**
 * Expose log function. Default to `console.log`.
 */

exports.log = console.log.bind(console);


/**
 * Enabled debuggers.
 */

var names = []
  , skips = []
  , config;

/**
 * Create a debugger with the given `name`.
 *
 * @param {String} name
 * @return {Type}
 * @api public
 */

function debug(name) {
  function disabled(){}
  disabled.enabled = false;

  var match = skips.some(function(re){
    return re.test(name);
  });

  if (match) return disabled;

  match = names.some(function(re){
    return re.test(name);
  });

  if (!match) return disabled;

  function logger(msg) {
    msg = (msg instanceof Error) ? (msg.stack || msg.message) : msg;
    Function.prototype.apply.call(logger.log, this, arguments);
  }

  logger.log = exports.log;
  logger.enabled = true;

  return logger;
}

exports.enable = function(name) {
  name = name.replace('*', '.*?');
  names.push(new RegExp('^' + name + '$'));
};

exports.enable.all = function() {
  exports.clear();
  exports.enable("*");
}

exports.disable = function(name) {
  name = name.replace('*', '.*?');
  skips.push(new RegExp('^' + name + '$'));
}

exports.disable.all = function() {
  exports.clear();
  exports.disable("*");
}

exports.clear = function() {
  skips = [];
  names = [];
}

exports.configure = function(val) {
  try {
    localStorage.debug = val;
  } catch(e){}

  config = val;
  exports.reset();
}

exports.reset = function() {
  exports.clear();

  config
    .split(/[\s,]+/)
    .forEach(function(name){
      if (name.length === 0 || name === '-') return;
      if (name[0] === '-') {
        exports.disable(name.substr(1));
      } else {
        exports.enable(name);
      }
    });
}

if (this.window) {
  if (!window.localStorage) return;
  exports.configure(localStorage.debug || '');
} else {
  exports.configure(process.env.DEBUG || '');
}

}).call(this,require('_process'))
},{"_process":84,"console":79}],46:[function(require,module,exports){
/*
 * cylon-keyboard adaptor
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

var Keyboard = require("./keyboard"),
    Keys = require("./keys");

var Adaptor = module.exports = function Adaptor() {
  Adaptor.__super__.constructor.apply(this, arguments);

  this.connector = this.keyboard = Keyboard;
};

Cylon.Utils.subclass(Adaptor, Cylon.Adaptor);

Adaptor.prototype.connect = function(callback) {
  for (var i = 0; i < Keys.length; i++) {
    var key = Keys[i];
    this.defineAdaptorEvent({ eventName: key });
  }

  this.keyboard.connect();

  callback();
};

Adaptor.prototype.disconnect = function(callback) {
  callback();
};

},{"./keyboard":48,"./keys":49,"cylon":54}],47:[function(require,module,exports){
/*
 * cylon-keyboard driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

var Keys = require("./keys");

var Driver = module.exports = function Driver() {
  Driver.__super__.constructor.apply(this, arguments);
};

Cylon.Utils.subclass(Driver, Cylon.Driver);

Driver.prototype.start = function(callback) {
  for (var i = 0; i < Keys.length; i++) {
    var key = Keys[i];
    this.defineDriverEvent({ eventName: key });
  }

  callback();
};

Driver.prototype.halt = function(callback) {
  callback();
};

},{"./keys":49,"cylon":54}],48:[function(require,module,exports){
(function (process){
/*
 * cylon keyboard
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var keypress = require("hybridgroup-keypress"),
    EventEmitter = require("events").EventEmitter;

var Keyboard = module.exports = new EventEmitter();

Keyboard.connect = function connect() {
  var stdin = process.stdin;

  keypress(stdin);
  stdin.on("keypress", this.handleKeypress.bind(this));
  stdin.setRawMode(true);
  stdin.resume();
};

Keyboard.keyDowns = {};

Keyboard.keyDownsTimeouts = {};

Keyboard.setKeyupTimeout = function(timeoutDuration, key){
  var keyUpEvent = function() {
    this.keyDowns[key.name] = false;
    this.emit("keyup", key);
  }.bind(this);

  this.keyDownsTimeouts[key.name] = setTimeout(keyUpEvent, timeoutDuration);
};

Keyboard.handleKeypress = function handleKeypress(ch, key) {
  if (key) {
    if (key.ctrl && key.name === "c") {
      return process.kill(process.pid, "SIGINT");
    }

    this.emit(key.name, key);

    this.emit("keypress", key);

    if (this.keyDownsTimeouts[key.name]) {
      clearTimeout(this.keyDownsTimeouts[key.name]);
    }

    if (this.keyDowns[key.name]) {
      this.setKeyupTimeout(200, key);
    } else {
      this.keyDowns[key.name] = key;
      this.emit("keydown", key);

      this.setKeyupTimeout(500, key);
    }
  }
};

}).call(this,require('_process'))
},{"_process":84,"events":81,"hybridgroup-keypress":50}],49:[function(require,module,exports){
/*
 * Cylonjs Keyboard keys
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

module.exports = [
  /**
   * Emitted when the "a" key is pressed
   *
   * @event a
   */
  "a",

  /**
   * Emitted when the "b" key is pressed
   *
   * @event b
   */
  "b",

  /**
   * Emitted when the "c" key is pressed
   *
   * @event c
   */
  "c",

  /**
   * Emitted when the "d" key is pressed
   *
   * @event d
   */
  "d",

  /**
   * Emitted when the "e" key is pressed
   *
   * @event e
   */
  "e",

  /**
   * Emitted when the "f" key is pressed
   *
   * @event f
   */
  "f",

  /**
   * Emitted when the "g" key is pressed
   *
   * @event g
   */
  "g",

  /**
   * Emitted when the "h" key is pressed
   *
   * @event h
   */
  "h",

  /**
   * Emitted when the "i" key is pressed
   *
   * @event i
   */
  "i",

  /**
   * Emitted when the "j" key is pressed
   *
   * @event j
   */
  "j",

  /**
   * Emitted when the "k" key is pressed
   *
   * @event k
   */
  "k",

  /**
   * Emitted when the "l" key is pressed
   *
   * @event l
   */
  "l",

  /**
   * Emitted when the "m" key is pressed
   *
   * @event m
   */
  "m",

  /**
   * Emitted when the "n" key is pressed
   *
   * @event n
   */
  "n",

  /**
   * Emitted when the "o" key is pressed
   *
   * @event o
   */
  "o",

  /**
   * Emitted when the "p" key is pressed
   *
   * @event p
   */
  "p",

  /**
   * Emitted when the "q" key is pressed
   *
   * @event q
   */
  "q",

  /**
   * Emitted when the "r" key is pressed
   *
   * @event r
   */
  "r",

  /**
   * Emitted when the "s" key is pressed
   *
   * @event s
   */
  "s",

  /**
   * Emitted when the "t" key is pressed
   *
   * @event t
   */
  "t",

  /**
   * Emitted when the "u" key is pressed
   *
   * @event u
   */
  "u",

  /**
   * Emitted when the "v" key is pressed
   *
   * @event v
   */
  "v",

  /**
   * Emitted when the "w" key is pressed
   *
   * @event w
   */
  "w",

  /**
   * Emitted when the "x" key is pressed
   *
   * @event x
   */
  "x",

  /**
   * Emitted when the "y" key is pressed
   *
   * @event y
   */
  "y",

  /**
   * Emitted when the "z" key is pressed
   *
   * @event z
   */
  "z",

  /**
   * Emitted when the "1" key is pressed
   *
   * @event 1
   */
  "1",

  /**
   * Emitted when the "2" key is pressed
   *
   * @event 2
   */
  "2",

  /**
   * Emitted when the "3" key is pressed
   *
   * @event 3
   */
  "3",

  /**
   * Emitted when the "4" key is pressed
   *
   * @event 4
   */
  "4",

  /**
   * Emitted when the "5" key is pressed
   *
   * @event 5
   */
  "5",

  /**
   * Emitted when the "6" key is pressed
   *
   * @event 6
   */
  "6",

  /**
   * Emitted when the "7" key is pressed
   *
   * @event 7
   */
  "7",

  /**
   * Emitted when the "8" key is pressed
   *
   * @event 8
   */
  "8",

  /**
   * Emitted when the "9" key is pressed
   *
   * @event 9
   */
  "9",

  /**
   * Emitted when the "0" key is pressed
   *
   * @event 0
   */
  "0",

  /**
   * Emitted when the "f1" key is pressed
   *
   * @event f1
   */
  "f1",

  /**
   * Emitted when the "f2" key is pressed
   *
   * @event f2
   */
  "f2",

  /**
   * Emitted when the "f3" key is pressed
   *
   * @event f3
   */
  "f3",

  /**
   * Emitted when the "f4" key is pressed
   *
   * @event f4
   */
  "f4",

  /**
   * Emitted when the "f5" key is pressed
   *
   * @event f5
   */
  "f5",

  /**
   * Emitted when the "f6" key is pressed
   *
   * @event f6
   */
  "f6",

  /**
   * Emitted when the "f7" key is pressed
   *
   * @event f7
   */
  "f7",

  /**
   * Emitted when the "f8" key is pressed
   *
   * @event f8
   */
  "f8",

  /**
   * Emitted when the "f9" key is pressed
   *
   * @event f9
   */
  "f9",

  /**
   * Emitted when the "f10" key is pressed
   *
   * @event f10
   */
  "f10",

  /**
   * Emitted when the "f11" key is pressed
   *
   * @event f11
   */
  "f11",

  /**
   * Emitted when the "f12" key is pressed
   *
   * @event f12
   */
  "f12",

  /**
   * Emitted when the "space" key is pressed
   *
   * @event space
   */
  "space",

  /**
   * Emitted when the "backspace" key is pressed
   *
   * @event backspace
   */
  "backspace",

  /**
   * Emitted when the "return" key is pressed
   *
   * @event return
   */
  "return",

  /**
   * Emitted when the "left" key is pressed
   *
   * @event left
   */
  "left",

  /**
   * Emitted when the "right" key is pressed
   *
   * @event right
   */
  "right",

  /**
   * Emitted when the "up" key is pressed
   *
   * @event up
   */
  "up",

  /**
   * Emitted when the "down" key is pressed
   *
   * @event down
   */
  "down",

  /**
   * Emitted when the "clear" key is pressed
   *
   * @event clear
   */
  "clear",

  /**
   * Emitted when the "insert" key is pressed
   *
   * @event insert
   */
  "insert",

  /**
   * Emitted when the "delete" key is pressed
   *
   * @event delete
   */
  "delete",

  /**
   * Emitted when the "pageup" key is pressed
   *
   * @event pageup
   */
  "pageup",

  /**
   * Emitted when the "pagedown" key is pressed
   *
   * @event pagedown
   */
  "pagedown",

  /**
   * Emitted when the "home" key is pressed
   *
   * @event home
   */
  "home",

  /**
   * Emitted when the "end" key is pressed
   *
   * @event end
   */
  "end",

  /**
   * Emitted when any recognized key is pressed
   *
   * @event keydown
   */
  "keydown",

  /**
   * Emitted when any recognized key is released
   *
   * @event keyup
   */
  "keyup",

  /**
   * Emitted when any recognized key is pressed and released
   *
   * @event keypress
   */
  "keypress"
];

},{}],50:[function(require,module,exports){
(function (Buffer){

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;

/**
 * Module exports.
 */

exports = module.exports = keypress;

/**
 * This module offers the internal "keypress" functionality from node-core's
 * `readline` module, for your own programs and modules to use.
 *
 * The `keypress` function accepts a readable Stream instance and makes it
 * emit "keypress" events.
 *
 * Usage:
 *
 * ``` js
 * require('keypress')(process.stdin);
 *
 * process.stdin.on('keypress', function (ch, key) {
 *   console.log(ch, key);
 *   if (key.ctrl && key.name == 'c') {
 *     process.stdin.pause();
 *   }
 * });
 * proces.stdin.resume();
 * ```
 *
 * @param {Stream} stream
 * @api public
 */

function keypress(stream) {
  if (isEmittingKeypress(stream)) return;

  var StringDecoder = require('string_decoder').StringDecoder; // lazy load
  stream._keypressDecoder = new StringDecoder('utf8');

  function onData(b) {
    if (listenerCount(stream, 'keypress') > 0) {
      var r = stream._keypressDecoder.write(b);
      if (r) emitKey(stream, r);
    } else {
      // Nobody's watching anyway
      stream.removeListener('data', onData);
      stream.on('newListener', onNewListener);
    }
  }

  function onNewListener(event) {
    if (event == 'keypress') {
      stream.on('data', onData);
      stream.removeListener('newListener', onNewListener);
    }
  }

  if (listenerCount(stream, 'keypress') > 0) {
    stream.on('data', onData);
  } else {
    stream.on('newListener', onNewListener);
  }
}

/**
 * Returns `true` if the stream is already emitting "keypress" events.
 * `false` otherwise.
 *
 * @param {Stream} stream readable stream
 * @return {Boolean} `true` if the stream is emitting "keypress" events
 * @api private
 */

function isEmittingKeypress(stream) {
  var rtn = !!stream._keypressDecoder;
  if (!rtn) {
    // XXX: for older versions of node (v0.6.x, v0.8.x) we want to remove the
    // existing "data" and "newListener" keypress events since they won't include
    // this `keypress` module extensions (like "mousepress" events).
    stream.listeners('data').slice(0).forEach(function(l) {
      if (l.name == 'onData' && /emitKey/.test(l.toString())) {
        stream.removeListener('data', l);
      }
    });
    stream.listeners('newListener').slice(0).forEach(function(l) {
      if (l.name == 'onNewListener' && /keypress/.test(l.toString())) {
        stream.removeListener('newListener', l);
      }
    });
  }
  return rtn;
}

/**
 * Enables "mousepress" events on the *input* stream. Note that `stream` must be
 * an *output* stream (i.e. a Writable Stream instance), usually `process.stdout`.
 *
 * @param {Stream} stream writable stream instance
 * @api public
 */

exports.enableMouse = function (stream) {
  stream.write('\x1b[?1000h');
};

/**
 * Disables "mousepress" events from being sent to the *input* stream.
 * Note that `stream` must be an *output* stream (i.e. a Writable Stream instance),
 * usually `process.stdout`.
 *
 * @param {Stream} stream writable stream instance
 * @api public
 */

exports.disableMouse = function (stream) {
  stream.write('\x1b[?1000l');
};

/**
 * `EventEmitter.listenerCount()` polyfill, for backwards compat.
 *
 * @param {Emitter} emitter event emitter instance
 * @param {String} event event name
 * @return {Number} number of listeners for `event`
 * @api public
 */

var listenerCount = EventEmitter.listenerCount;
if (!listenerCount) {
  listenerCount = function(emitter, event) {
    return emitter.listeners(event).length;
  };
}


///////////////////////////////////////////////////////////////////////
// Below this function is code from node-core's `readline.js` module //
///////////////////////////////////////////////////////////////////////


/*
  Some patterns seen in terminal key escape codes, derived from combos seen
  at http://www.midnight-commander.org/browser/lib/tty/key.c

  ESC letter
  ESC [ letter
  ESC [ modifier letter
  ESC [ 1 ; modifier letter
  ESC [ num char
  ESC [ num ; modifier char
  ESC O letter
  ESC O modifier letter
  ESC O 1 ; modifier letter
  ESC N letter
  ESC [ [ num ; modifier char
  ESC [ [ 1 ; modifier letter
  ESC ESC [ num char
  ESC ESC O letter

  - char is usually ~ but $ and ^ also happen with rxvt
  - modifier is 1 +
                (shift     * 1) +
                (left_alt  * 2) +
                (ctrl      * 4) +
                (right_alt * 8)
  - two leading ESCs apparently mean the same as one leading ESC
*/

// Regexes used for ansi escape code splitting
var metaKeyCodeRe = /^(?:\x1b)([a-zA-Z0-9])$/;
var functionKeyCodeRe =
    /^(?:\x1b+)(O|N|\[|\[\[)(?:(\d+)(?:;(\d+))?([~^$])|(?:1;)?(\d+)?([a-zA-Z]))/;

function emitKey(stream, s) {
  var ch,
      key = {
        name: undefined,
        ctrl: false,
        meta: false,
        shift: false
      },
      parts;

  if (Buffer.isBuffer(s)) {
    if (s[0] > 127 && s[1] === undefined) {
      s[0] -= 128;
      s = '\x1b' + s.toString(stream.encoding || 'utf-8');
    } else {
      s = s.toString(stream.encoding || 'utf-8');
    }
  }

  key.sequence = s;

  if (s === '\r') {
    // carriage return
    key.name = 'return';

  } else if (s === '\n') {
    // enter, should have been called linefeed
    key.name = 'enter';

  } else if (s === '\t') {
    // tab
    key.name = 'tab';

  } else if (s === '\b' || s === '\x7f' ||
             s === '\x1b\x7f' || s === '\x1b\b') {
    // backspace or ctrl+h
    key.name = 'backspace';
    key.meta = (s.charAt(0) === '\x1b');

  } else if (s === '\x1b' || s === '\x1b\x1b') {
    // escape key
    key.name = 'escape';
    key.meta = (s.length === 2);

  } else if (s === ' ' || s === '\x1b ') {
    key.name = 'space';
    key.meta = (s.length === 2);

  } else if (s <= '\x1a') {
    // ctrl+letter
    key.name = String.fromCharCode(s.charCodeAt(0) + 'a'.charCodeAt(0) - 1);
    key.ctrl = true;

  } else if (s.length === 1 && s >= 'a' && s <= 'z') {
    // lowercase letter
    key.name = s;

  } else if (s.length === 1 && s >= 'A' && s <= 'Z') {
    // shift+letter
    key.name = s.toLowerCase();
    key.shift = true;

  } else if (!isNaN(parseInt(s, 10))) {
    // number
    key.name = s;
  } else if (parts = metaKeyCodeRe.exec(s)) {
    // meta+character key
    key.name = parts[1].toLowerCase();
    key.meta = true;
    key.shift = /^[A-Z]$/.test(parts[1]);

  } else if (parts = functionKeyCodeRe.exec(s)) {
    // ansi escape sequence

    // reassemble the key code leaving out leading \x1b's,
    // the modifier key bitflag and any meaningless "1;" sequence
    var code = (parts[1] || '') + (parts[2] || '') +
               (parts[4] || '') + (parts[6] || ''),
        modifier = (parts[3] || parts[5] || 1) - 1;

    // Parse the key modifier
    key.ctrl = !!(modifier & 4);
    key.meta = !!(modifier & 10);
    key.shift = !!(modifier & 1);
    key.code = code;

    // Parse the key itself
    switch (code) {
      /* xterm/gnome ESC O letter */
      case 'OP': key.name = 'f1'; break;
      case 'OQ': key.name = 'f2'; break;
      case 'OR': key.name = 'f3'; break;
      case 'OS': key.name = 'f4'; break;

      /* xterm/rxvt ESC [ number ~ */
      case '[11~': key.name = 'f1'; break;
      case '[12~': key.name = 'f2'; break;
      case '[13~': key.name = 'f3'; break;
      case '[14~': key.name = 'f4'; break;

      /* from Cygwin and used in libuv */
      case '[[A': key.name = 'f1'; break;
      case '[[B': key.name = 'f2'; break;
      case '[[C': key.name = 'f3'; break;
      case '[[D': key.name = 'f4'; break;
      case '[[E': key.name = 'f5'; break;

      /* common */
      case '[15~': key.name = 'f5'; break;
      case '[17~': key.name = 'f6'; break;
      case '[18~': key.name = 'f7'; break;
      case '[19~': key.name = 'f8'; break;
      case '[20~': key.name = 'f9'; break;
      case '[21~': key.name = 'f10'; break;
      case '[23~': key.name = 'f11'; break;
      case '[24~': key.name = 'f12'; break;

      /* xterm ESC [ letter */
      case '[A': key.name = 'up'; break;
      case '[B': key.name = 'down'; break;
      case '[C': key.name = 'right'; break;
      case '[D': key.name = 'left'; break;
      case '[E': key.name = 'clear'; break;
      case '[F': key.name = 'end'; break;
      case '[H': key.name = 'home'; break;

      /* xterm/gnome ESC O letter */
      case 'OA': key.name = 'up'; break;
      case 'OB': key.name = 'down'; break;
      case 'OC': key.name = 'right'; break;
      case 'OD': key.name = 'left'; break;
      case 'OE': key.name = 'clear'; break;
      case 'OF': key.name = 'end'; break;
      case 'OH': key.name = 'home'; break;

      /* xterm/rxvt ESC [ number ~ */
      case '[1~': key.name = 'home'; break;
      case '[2~': key.name = 'insert'; break;
      case '[3~': key.name = 'delete'; break;
      case '[4~': key.name = 'end'; break;
      case '[5~': key.name = 'pageup'; break;
      case '[6~': key.name = 'pagedown'; break;

      /* putty */
      case '[[5~': key.name = 'pageup'; break;
      case '[[6~': key.name = 'pagedown'; break;

      /* rxvt */
      case '[7~': key.name = 'home'; break;
      case '[8~': key.name = 'end'; break;

      /* rxvt keys with modifiers */
      case '[a': key.name = 'up'; key.shift = true; break;
      case '[b': key.name = 'down'; key.shift = true; break;
      case '[c': key.name = 'right'; key.shift = true; break;
      case '[d': key.name = 'left'; key.shift = true; break;
      case '[e': key.name = 'clear'; key.shift = true; break;

      case '[2$': key.name = 'insert'; key.shift = true; break;
      case '[3$': key.name = 'delete'; key.shift = true; break;
      case '[5$': key.name = 'pageup'; key.shift = true; break;
      case '[6$': key.name = 'pagedown'; key.shift = true; break;
      case '[7$': key.name = 'home'; key.shift = true; break;
      case '[8$': key.name = 'end'; key.shift = true; break;

      case 'Oa': key.name = 'up'; key.ctrl = true; break;
      case 'Ob': key.name = 'down'; key.ctrl = true; break;
      case 'Oc': key.name = 'right'; key.ctrl = true; break;
      case 'Od': key.name = 'left'; key.ctrl = true; break;
      case 'Oe': key.name = 'clear'; key.ctrl = true; break;

      case '[2^': key.name = 'insert'; key.ctrl = true; break;
      case '[3^': key.name = 'delete'; key.ctrl = true; break;
      case '[5^': key.name = 'pageup'; key.ctrl = true; break;
      case '[6^': key.name = 'pagedown'; key.ctrl = true; break;
      case '[7^': key.name = 'home'; key.ctrl = true; break;
      case '[8^': key.name = 'end'; key.ctrl = true; break;

      /* misc. */
      case '[Z': key.name = 'tab'; key.shift = true; break;
      default: key.name = 'undefined'; break;

    }
  } else if (s.length > 1 && s[0] !== '\x1b') {
    // Got a longer-than-one string of characters.
    // Probably a paste, since it wasn't a control sequence.
    Array.prototype.forEach.call(s, function(c) {
      emitKey(stream, c);
    });
    return;
  }

  // XXX: this "mouse" parsing code is NOT part of the node-core standard
  // `readline.js` module, and is a `keypress` module non-standard extension.
  if (key.code == '[M') {
    key.name = 'mouse';
    var s = key.sequence;
    var b = s.charCodeAt(3);
    key.x = s.charCodeAt(4) - 040;
    key.y = s.charCodeAt(5) - 040;

    key.scroll = 0;

    key.ctrl  = !!(1<<4 & b);
    key.meta  = !!(1<<3 & b);
    key.shift = !!(1<<2 & b);

    key.release = (3 & b) === 3;

    if (1<<6 & b) { //scroll
      key.scroll = 1 & b ? 1 : -1;
    }

    if (!key.release && !key.scroll) {
      key.button = b & 3;
    }
  }

  // Don't emit a key if no name was found
  if (key.name === undefined) {
    key = undefined;
  }

  if (s.length === 1) {
    ch = s;
  }

  if (key && key.name == 'mouse') {
    stream.emit('mousepress', key);
  } else if (key || ch) {
    stream.emit('keypress', ch, key);
  }
}

}).call(this,require("buffer").Buffer)
},{"buffer":75,"events":81,"string_decoder":97}],51:[function(require,module,exports){
arguments[4][2][0].apply(exports,arguments)
},{"./basestar":52,"./utils":68,"./utils/helpers":69,"dup":2}],52:[function(require,module,exports){
arguments[4][3][0].apply(exports,arguments)
},{"./utils":68,"./utils/helpers":69,"dup":3,"events":81}],53:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"dup":4}],54:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"./adaptor":51,"./config":53,"./driver":55,"./io/digital-pin":57,"./io/utils":58,"./logger":59,"./robot":63,"./utils":68,"./utils/helpers":69,"_process":84,"async":71,"dup":5,"events":81,"readline":72}],55:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"./basestar":52,"./utils":68,"./utils/helpers":69,"dup":6}],56:[function(require,module,exports){
arguments[4][7][0].apply(exports,arguments)
},{"./config":53,"./registry":62,"./utils/helpers":69,"_process":84,"dup":7}],57:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"../utils":68,"dup":8,"events":81,"fs":72}],58:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],59:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"./config":53,"./logger/basic_logger":60,"./logger/null_logger":61,"./utils/helpers":69,"_process":84,"dup":10}],60:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11}],61:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"dup":12}],62:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"./logger":59,"./test/loopback":64,"./test/ping":65,"./test/test-adaptor":66,"./test/test-driver":67,"./utils/helpers":69,"_process":84,"dup":13}],63:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"./config":53,"./initializer":56,"./logger":59,"./utils":68,"./utils/helpers":69,"_process":84,"async":71,"dup":14,"events":81}],64:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"../adaptor":51,"../utils":68,"dup":15}],65:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"../driver":55,"../utils":68,"dup":16}],66:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"../adaptor":51,"../utils":68,"dup":17}],67:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"../driver":55,"../utils":68,"dup":18}],68:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"./utils/helpers":69,"./utils/monkey-patches":70,"dup":19}],69:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],70:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"dup":21}],71:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"_process":84,"dup":22}],72:[function(require,module,exports){

},{}],73:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && !isFinite(value)) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) {
    return a === b;
  }
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  var ka = objectKeys(a),
      kb = objectKeys(b),
      key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":99}],74:[function(require,module,exports){
arguments[4][72][0].apply(exports,arguments)
},{"dup":72}],75:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff
var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  this.length = 0
  this.parent = undefined

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined' && object.buffer instanceof ArrayBuffer) {
    return fromTypedArray(that, object)
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = String(string)

  if (string.length === 0) return 0

  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      return string.length
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return string.length * 2
    case 'hex':
      return string.length >>> 1
    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(string).length
    case 'base64':
      return base64ToBytes(string).length
    default:
      return string.length
  }
}
Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function toString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []
  var i = 0

  for (; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (leadSurrogate) {
        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        } else {
          // valid surrogate pair
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      } else {
        // no lead yet

        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else {
          // valid lead
          leadSurrogate = codePoint
          continue
        }
      }
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":76,"ieee754":77,"is-array":78}],76:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],77:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],78:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],79:[function(require,module,exports){
(function (global){
/*global window, global*/
var util = require("util")
var assert = require("assert")
var now = require("date-now")

var slice = Array.prototype.slice
var console
var times = {}

if (typeof global !== "undefined" && global.console) {
    console = global.console
} else if (typeof window !== "undefined" && window.console) {
    console = window.console
} else {
    console = {}
}

var functions = [
    [log, "log"],
    [info, "info"],
    [warn, "warn"],
    [error, "error"],
    [time, "time"],
    [timeEnd, "timeEnd"],
    [trace, "trace"],
    [dir, "dir"],
    [consoleAssert, "assert"]
]

for (var i = 0; i < functions.length; i++) {
    var tuple = functions[i]
    var f = tuple[0]
    var name = tuple[1]

    if (!console[name]) {
        console[name] = f
    }
}

module.exports = console

function log() {}

function info() {
    console.log.apply(console, arguments)
}

function warn() {
    console.log.apply(console, arguments)
}

function error() {
    console.warn.apply(console, arguments)
}

function time(label) {
    times[label] = now()
}

function timeEnd(label) {
    var time = times[label]
    if (!time) {
        throw new Error("No such label: " + label)
    }

    var duration = now() - time
    console.log(label + ": " + duration + "ms")
}

function trace() {
    var err = new Error()
    err.name = "Trace"
    err.message = util.format.apply(null, arguments)
    console.error(err.stack)
}

function dir(object) {
    console.log(util.inspect(object) + "\n")
}

function consoleAssert(expression) {
    if (!expression) {
        var arr = slice.call(arguments, 1)
        assert.ok(false, util.format.apply(null, arr))
    }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"assert":73,"date-now":80,"util":99}],80:[function(require,module,exports){
module.exports = now

function now() {
    return new Date().getTime()
}

},{}],81:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],82:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],83:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],84:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],85:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":86}],86:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

forEach(objectKeys(Writable.prototype), function(method) {
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
});

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(this.end.bind(this));
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

}).call(this,require('_process'))
},{"./_stream_readable":88,"./_stream_writable":90,"_process":84,"core-util-is":91,"inherits":82}],87:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./_stream_transform":89,"core-util-is":91,"inherits":82}],88:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

var Stream = require('stream');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var StringDecoder;


/*<replacement>*/
var debug = require('util');
if (debug && debug.debuglog) {
  debug = debug.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/


util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.readableObjectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  var Duplex = require('./_stream_duplex');

  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (util.isString(chunk) && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (util.isNullOrUndefined(chunk)) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      if (!addToFront)
        state.reading = false;

      // if we want the data now, just emit it.
      if (state.flowing && state.length === 0 && !state.sync) {
        stream.emit('data', chunk);
        stream.read(0);
      } else {
        // update the buffer info.
        state.length += state.objectMode ? 1 : chunk.length;
        if (addToFront)
          state.buffer.unshift(chunk);
        else
          state.buffer.push(chunk);

        if (state.needReadable)
          emitReadable(stream);
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (isNaN(n) || util.isNull(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  debug('read', n);
  var state = this._readableState;
  var nOrig = n;

  if (!util.isNumber(n) || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended)
      endReadable(this);
    else
      emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0)
      endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  }

  if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read pushed data synchronously, then `reading` will be false,
  // and we need to re-evaluate how much data we can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (util.isNull(ret)) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we tried to read() past the EOF, then emit end on the next tick.
  if (nOrig !== n && state.ended && state.length === 0)
    endReadable(this);

  if (!util.isNull(ret))
    this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!util.isBuffer(chunk) &&
      !util.isString(chunk) &&
      !util.isNullOrUndefined(chunk) &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync)
      process.nextTick(function() {
        emitReadable_(stream);
      });
    else
      emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    process.nextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain &&
        (!dest._writableState || dest._writableState.needDrain))
      ondrain();
  }

  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    if (false === ret) {
      debug('false write response, pause',
            src._readableState.awaitDrain);
      src._readableState.awaitDrain++;
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain)
      state.awaitDrain--;
    if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  // If listening to data, and it has not explicitly been paused,
  // then call resume to start the flow of data on the next tick.
  if (ev === 'data' && false !== this._readableState.flowing) {
    this.resume();
  }

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        var self = this;
        process.nextTick(function() {
          debug('readable nexttick read 0');
          self.read(0);
        });
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    if (!state.reading) {
      debug('resume read 0');
      this.read(0);
    }
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(function() {
      resume_(stream, state);
    });
  }
}

function resume_(stream, state) {
  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading)
    stream.read(0);
}

Readable.prototype.pause = function() {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  if (state.flowing) {
    do {
      var chunk = stream.read();
    } while (null !== chunk && state.flowing);
  }
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    debug('wrapped data');
    if (state.decoder)
      chunk = state.decoder.write(chunk);
    if (!chunk || !state.objectMode && !chunk.length)
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (util.isFunction(stream[i]) && util.isUndefined(this[i])) {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require('_process'))
},{"./_stream_duplex":86,"_process":84,"buffer":75,"core-util-is":91,"events":81,"inherits":82,"isarray":83,"stream":96,"string_decoder/":97,"util":74}],89:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (!util.isNullOrUndefined(data))
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('prefinish', function() {
    if (util.isFunction(this._flush))
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (!util.isNull(ts.writechunk) && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./_stream_duplex":86,"core-util-is":91,"inherits":82}],90:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Stream = require('stream');

util.inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.writableObjectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  process.nextTick(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!util.isBuffer(chunk) &&
      !util.isString(chunk) &&
      !util.isNullOrUndefined(chunk) &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    process.nextTick(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (util.isFunction(encoding)) {
    cb = encoding;
    encoding = null;
  }

  if (util.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (!util.isFunction(cb))
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function() {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function() {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing &&
        !state.corked &&
        !state.finished &&
        !state.bufferProcessing &&
        state.buffer.length)
      clearBuffer(this, state);
  }
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      util.isString(chunk)) {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  if (util.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing || state.corked)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, false, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev)
    stream._writev(chunk, state.onwrite);
  else
    stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    process.nextTick(function() {
      state.pendingcb--;
      cb(er);
    });
  else {
    state.pendingcb--;
    cb(er);
  }

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished &&
        !state.corked &&
        !state.bufferProcessing &&
        state.buffer.length) {
      clearBuffer(stream, state);
    }

    if (sync) {
      process.nextTick(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  if (stream._writev && state.buffer.length > 1) {
    // Fast case, write everything using _writev()
    var cbs = [];
    for (var c = 0; c < state.buffer.length; c++)
      cbs.push(state.buffer[c].callback);

    // count the one we are adding, as well.
    // TODO(isaacs) clean this up
    state.pendingcb++;
    doWrite(stream, state, true, state.length, state.buffer, '', function(err) {
      for (var i = 0; i < cbs.length; i++) {
        state.pendingcb--;
        cbs[i](err);
      }
    });

    // Clear buffer
    state.buffer = [];
  } else {
    // Slow case, write chunks one-by-one
    for (var c = 0; c < state.buffer.length; c++) {
      var entry = state.buffer[c];
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);

      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        c++;
        break;
      }
    }

    if (c < state.buffer.length)
      state.buffer = state.buffer.slice(c);
    else
      state.buffer.length = 0;
  }

  state.bufferProcessing = false;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));

};

Writable.prototype._writev = null;

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (util.isFunction(chunk)) {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (util.isFunction(encoding)) {
    cb = encoding;
    encoding = null;
  }

  if (!util.isNullOrUndefined(chunk))
    this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else
      prefinish(stream, state);
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      process.nextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

}).call(this,require('_process'))
},{"./_stream_duplex":86,"_process":84,"buffer":75,"core-util-is":91,"inherits":82,"stream":96}],91:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return Buffer.isBuffer(arg);
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}
}).call(this,require("buffer").Buffer)
},{"buffer":75}],92:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":87}],93:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = require('stream');
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":86,"./lib/_stream_passthrough.js":87,"./lib/_stream_readable.js":88,"./lib/_stream_transform.js":89,"./lib/_stream_writable.js":90,"stream":96}],94:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":89}],95:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":90}],96:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":81,"inherits":82,"readable-stream/duplex.js":85,"readable-stream/passthrough.js":92,"readable-stream/readable.js":93,"readable-stream/transform.js":94,"readable-stream/writable.js":95}],97:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":75}],98:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],99:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":98,"_process":84,"inherits":82}],"cylon-ardrone":[function(require,module,exports){
/*
 * cylon-ardrone
 * http://cylonjs.com
 *
 * Copyright (c) 2013 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var ARDrone = require("./ardrone");

var Flight = require("./flight"),
    Nav = require("./nav");

module.exports = {
  adaptors: ["ardrone"],
  drivers: ["ardrone", "ardrone-nav"],

  adaptor: function(opts) {
    return new ARDrone(opts);
  },

  driver: function(opts) {
    if (opts == null) {
      opts = {};
    }

    switch (opts.driver) {
      case "ardrone":
        return new Flight(opts);

      case "ardrone-nav":
        return new Nav(opts);

      default:
        return null;
    }
  }
};

},{"./ardrone":23,"./flight":25,"./nav":26}],"cylon-keyboard":[function(require,module,exports){
/*
 * cylon-keyboard
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Adaptor = require("./adaptor"),
    Driver = require("./driver");

module.exports = {
  adaptors: ["keyboard"],
  drivers: ["keyboard"],

  adaptor: function(opts) {
    return new Adaptor(opts);
  },

  driver: function(opts) {
    return new Driver(opts);
  }
};

},{"./adaptor":46,"./driver":47}],100:[function(require,module,exports){
(function (process){
"use strict";

var Cylon = require('cylon');

// log directly to the page if we're in the browser
if (process.browser) {
  var BrowserLogger = require('./browser-logger'),
      logContainer = document.getElementById("log");

  console.log("Setting logger!");
  Cylon.Logger.setup({
    logger: BrowserLogger(logContainer),
    level: 'debug'
  });
}

// Cylon.robot({
//   name: "BrowserBot",

//   connections: {
//     arduino: { adaptor: 'firmata', port: '/dev/tty.usbmodem1411' }
//   },

//   devices: {
//     led: { driver: 'led', pin: 8 }
//   },

//   work: function(my) {
//     Cylon.Logger.info("Hi, my name is " + my.name)

//     every((2).seconds(), function() {
//       Cylon.Logger.info("Toggling the LED");
//       my.led.toggle();
//     });
//   }
// });

// Cylon.start();

Cylon.robot({

  connections: {
    ardrone: { adaptor: 'ardrone', port: '192.168.1.1' },
    keyboard: { adaptor: 'keyboard' }
  },

  devices: {
    drone: { driver: 'ardrone', connection: 'ardrone' },
    keyboard: { driver: 'keyboard', connection: 'keyboard' }
  },


  work: function(my) {
    console.log(my.drone)
    my.keyboard.on("keypress", function(key) {
      console.log(key.name + " PRESSED!");
      if (key.name === "t") {
        console.log("LIFT OFF!");
        my.drone.takeoff();
      }else if (key.name === "h"){
        console.log("hovering");
        my.drone.hover();
      }else if (key.name === "q"){
        console.log("Landing!");
        my.drone.land();
        my.drone.stop();
      }else if (key.name === "z"){
        console.log("CALIBRATE");
        my.drone.calibrate();
      }else if (key.name === "up"){
        console.log("going up");
        my.drone.up(0.5);
      }else if (key.name === "down"){
        console.log("going down");
        my.drone.down(0.5);
      }else if (key.name === "left"){
        console.log("turning left");
        my.drone.counterClockwise(0.5);
      }else if (key.name === "right"){
        console.log("turning right");
        my.drone.clockwise(0.5);
      }else if (key.name === "w"){
        console.log("going forward");
        my.drone.front(0.5);
      }else if (key.name === "a"){
        console.log("going left");
        my.drone.left(0.5);
      }else if (key.name === "s"){
        console.log("going back");
        my.drone.back(0.5);
      }else if (key.name === "d"){
        console.log("going right");
        my.drone.right(0.5);
      }else if (key.name === "f"){
        console.log("front flip time!!");
        my.drone.frontFlip();
      }else if (key.name === "g"){
        console.log("back flip time!!");
        my.drone.backFlip();
      }else if (key.name === "c"){
        console.log("left flip time!!");
        my.drone.leftFlip();
      }else if (key.name === "v"){
        console.log("right flip time!!");
        my.drone.rightFlip();
      }else if (key.name === "x"){
        console.log("LED BOMB");
        my.drone.animateLeds();
      }else if (key.name === "r"){
        console.log("wave hello, Yago");
        my.drone.wave();
      }
    });
    my.keyboard.on("keyup", function(key) {
      console.log("hovering");
      my.drone.hover();
    });
    // w,a,s,d,f,g,c,v,z,x,q,r,t,up,left,down,right
  }
}).start();

}).call(this,require('_process'))
},{"./browser-logger":1,"_process":84,"cylon":5}]},{},[100]);
