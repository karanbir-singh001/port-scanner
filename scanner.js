"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var net = require("net");
var async_1 = require("async");
var _a = process.env, _b = _a.VMIP, VMIP = _b === void 0 ? '127.0.0.1' : _b, _c = _a.PORTS, PORTS = _c === void 0 ? '1-65535' : _c; //change the i.p
var MAX_SCANS = 4096;
var SCAN_HOST ='127.0.0.1';
var TIMEOUT = 2000;
var report = {};
var ports = [];
var groups = PORTS.split(',');
var addPort = function (port) { return ports.includes(port) || ports.push(port); };
var mapPorts = function () {
    groups.map(function (grp) { return grp.trim(); }).forEach(function (grp) {
        if (/^[0-9]+$/.test(grp)) {
            var num = parseInt(grp, 10);
            addPort(num);
        }
        else if (/^[0-9]+\-[0-9]+$/.test(grp)) {
            var _a = grp.split('-').map(function (prt) { return parseInt(prt, 10); }), min = _a[0], max = _a[1];
            for (var i = min; i <= max; i++) {
                addPort(i);
            }
        }
        else {
            console.warn("ERROR: Invalid port/range given - '".concat(grp, "'"));
        }
    });
};
var categorize = function (data) {
    var cats = ['FTP', 'SSH', 'TELNET', 'MYSQL', 'SMB', 'SAMBA', 'RPC', 'BIND'];
    return cats.filter(function (cat) { return (new RegExp(cat, 'im')).test(data); });
};
var testPort = function (port) {
    return new Promise(function (resolve, reject) {
        var sock = new net.Socket();
        var onError = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            sock.destroy();
            reject(new Error("Socket error: ".concat(port)));
        };
        sock.setTimeout(TIMEOUT);
        sock.once('error', onError);
        sock.once('timeout', onError);
        sock.connect(port, SCAN_HOST, function () {
            report[port] = "[open] ".concat(port, "/tcp ").padEnd(18);
            sock.on('data', function (data) {
                report[port] += " :: [".concat(categorize(data.toString()).join(', '), "]").padEnd(16);
                report[port] += " :: ".concat(data.toString().split("\n")[0]);
            });
            sock.end();
            resolve();
        });
    });
};
var runScan = function () {
    var started = Date.now();
    mapPorts();
    console.log("Scanning ".concat(ports.length, " port(s):"), PORTS);
    async_1.default.eachLimit(ports, MAX_SCANS, function (port, next) {
        testPort(port).then(function (res) {
            console.log("OPEN ".concat(port));
            next();
        }).catch(function (err) {
            next();
        });
    }, function (err) {
        if (err)
            throw err;
        var finished = Date.now();
        var duration = finished - started;
        var seconds = (duration / 1000).toFixed(2);
        console.log(Object.values(report).join("\n"));
        console.log("Finished (".concat(ports.length, " port(s) scanned in ").concat(seconds, "s)"));
    });
};
runScan();
