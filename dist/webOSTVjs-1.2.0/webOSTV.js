window.webOS = function(e) {
    var n = {};

    function r(t) {
        if (n[t]) return n[t].exports;
        var o = n[t] = {
            i: t,
            l: !1,
            exports: {}
        };
        return e[t].call(o.exports, o, o.exports, r), o.l = !0, o.exports
    }
    return r.m = e, r.c = n, r.d = function(e, n, t) {
        r.o(e, n) || Object.defineProperty(e, n, {
            enumerable: !0,
            get: t
        })
    }, r.r = function(e) {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, {
            value: "Module"
        }), Object.defineProperty(e, "__esModule", {
            value: !0
        })
    }, r.t = function(e, n) {
        if (1 & n && (e = r(e)), 8 & n) return e;
        if (4 & n && "object" == typeof e && e && e.__esModule) return e;
        var t = Object.create(null);
        if (r.r(t), Object.defineProperty(t, "default", {
                enumerable: !0,
                value: e
            }), 2 & n && "string" != typeof e)
            for (var o in e) r.d(t, o, function(n) {
                return e[n]
            }.bind(null, o));
        return t
    }, r.n = function(e) {
        var n = e && e.__esModule ? function() {
            return e.default;
        } : function() {
            return e
        };
        return r.d(n, "a", n), n
    }, r.o = function(e, n) {
        return Object.prototype.hasOwnProperty.call(e, n)
    }, r.p = "", r(r.s = 0)
}([function(e, n, r) {
    "use strict";
    r.r(n);
    var t = function() {
            return window.PalmSystem && window.PalmSystem.identifier ? window.PalmSystem.identifier.split(" ")[0] : ""
        },
        o = {},
        i = function(e, n) {
            if (0 === Object.keys(o).length) {
                var r = function(n, r) {
                        if (!n && r) try {
                            o = JSON.parse(r), e && e(o)
                        } catch (n) {
                            console.error("Unable to parse appinfo.json file for", t()), e && e()
                        } else e && e()
                    },
                    i = new window.XMLHttpRequest;
                i.onreadystatechange = function() {
                    4 === i.readyState && (i.status >= 200 && i.status < 300 || 0 === i.status ? r(null, i.responseText) : r({
                        status: 404
                    }))
                };
                try {
                    i.open("GET", n || "appinfo.json", !0), i.send(null)
                } catch (e) {
                    r({
                        status: 404
                    })
                }
            } else e && e(o)
        },
        s = function() {
            var e = window.location.href;
            if ("baseURI" in window.document) e = window.document.baseURI;
            else {
                var n = window.document.getElementsByTagName("base");
                n.length > 0 && (e = n[0].href)
            }
            var r = e.match(new RegExp(".*://[^#]*/"));
            return r ? r[0] : ""
        },
        a = function() {
            if (window.PalmSystem && window.PalmSystem.platformBack) return window.PalmSystem.platformBack()
        };

    function c(e, n) {
        var r = Object.keys(e);
        if (Object.getOwnPropertySymbols) {
            var t = Object.getOwnPropertySymbols(e);
            n && (t = t.filter(function(n) {
                return Object.getOwnPropertyDescriptor(e, n).enumerable
            })), r.push.apply(r, t)
        }
        return r
    }

    function u(e) {
        for (var n = 1; n < arguments.length; n++) {
            var r = null != arguments[n] ? arguments[n] : {};
            n % 2 ? c(r, !0).forEach(function(n) {
                l(e, n, r[n])
            }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : c(r).forEach(function(n) {
                Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n))
            })
        }
        return e
    }

    function l(e, n, r) {
        return n in e ? Object.defineProperty(e, n, {
            value: r,
            enumerable: !0,
            configurable: !0,
            writable: !0
        }) : e[n] = r, e
    }

    function f(e, n) {
        for (var r = 0; r < n.length; r++) {
            var t = n[r];
            t.enumerable = t.enumerable || !1, t.configurable = !0, "value" in t && (t.writable = !0), Object.defineProperty(e, t.key, t)
        }
    }
    var d = {},
        m = function() {
            function e() {
                ! function(e, n) {
                    if (!(e instanceof n)) throw new TypeError("Cannot call a class as a function")
                }(this, e), this.bridge = null, this.cancelled = !1, this.subscribe = !1
            }
            var n, r, t;
            return n = e, (r = [{
                key: "send",
                value: function(e) {
                    var n = e.service,
                        r = void 0 === n ? "" : n,
                        t = e.method,
                        o = void 0 === t ? "" : t,
                        i = e.parameters,
                        s = void 0 === i ? {} : i,
                        a = e.onSuccess,
                        c = void 0 === a ? function() {} : a,
                        l = e.onFailure,
                        f = void 0 === l ? function() {} : l,
                        m = e.onComplete,
                        w = void 0 === m ? function() {} : m,
                        v = e.subscribe,
                        y = void 0 !== v && v;
                    if (!window.PalmServiceBridge) {
                        var p = {
                            errorCode: -1,
                            errorText: "PalmServiceBridge is not found.",
                            returnValue: !1
                        };
                        return f(p), w(p), console.error("PalmServiceBridge is not found."), this
                    }
                    this.ts && d[this.ts] && delete d[this.ts];
                    var h, b = u({}, s);
                    return this.subscribe = y, this.subscribe && (b.subscribe = this.subscribe), b.subscribe && (this.subscribe = b.subscribe), this.ts = Date.now(), d[this.ts] = this, this.bridge = new PalmServiceBridge, this.bridge.onservicecallback = this.callback.bind(this, c, f, w), this.bridge.call(("/" !== (h = r).slice(-1) && (h += "/"), h + o), JSON.stringify(b)), this
                }
            }, {
                key: "callback",
                value: function() {
                    var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : function() {},
                        n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : function() {},
                        r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : function() {},
                        t = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : "";
                    if (!this.cancelled) {
                        var o = {};
                        try {
                            o = JSON.parse(t)
                        } catch (e) {
                            o = {
                                errorCode: -1,
                                errorText: t,
                                returnValue: !1
                            }
                        }
                        var i = o,
                            s = i.errorCode,
                            a = i.returnValue;
                        s || !1 === a ? (o.returnValue = !1, n(o)) : (o.returnValue = !0, e(o)), r(o), this.subscribe || this.cancel()
                    }
                }
            }, {
                key: "cancel",
                value: function() {
                    this.cancelled = !0, null !== this.bridge && (this.bridge.cancel(), this.bridge = null), this.ts && d[this.ts] && delete d[this.ts]
                }
            }]) && f(n.prototype, r), t && f(n, t), e
        }(),
        w = {
            request: function() {
                var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "",
                    n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
                    r = u({
                        service: e
                    }, n);
                return (new m).send(r)
            }
        };

    function v(e) {
        return (v = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e) {
            return typeof e
        } : function(e) {
            return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e
        })(e)
    }
    var y = {};
    if ("object" === ("undefined" == typeof window ? "undefined" : v(window)) && window.PalmSystem) {
        if (window.navigator.userAgent.indexOf("SmartWatch") > -1) y.watch = !0;
        else if (window.navigator.userAgent.indexOf("SmartTV") > -1 || window.navigator.userAgent.indexOf("Large Screen") > -1) y.tv = !0;
        else {
            try {
                var p = JSON.parse(window.PalmSystem.deviceInfo || "{}");
                if (p.platformVersionMajor && p.platformVersionMinor) {
                    var h = Number(p.platformVersionMajor),
                        b = Number(p.platformVersionMinor);
                    h < 3 || 3 === h && b <= 0 ? y.legacy = !0 : y.open = !0
                }
            } catch (e) {
                y.open = !0
            }
            window.Mojo = window.Mojo || {
                relaunch: function() {}
            }, window.PalmSystem.stageReady && window.PalmSystem.stageReady()
        }
        if (window.navigator.userAgent.indexOf("Chr0me") > -1 || window.navigator.userAgent.indexOf("Chrome") > -1) {
            var g = window.navigator.userAgent.indexOf("Chr0me") > -1 ? window.navigator.userAgent.indexOf("Chr0me") : window.navigator.userAgent.indexOf("Chrome"),
                S = window.navigator.userAgent.slice(g).indexOf(" ");
            window.navigator.userAgent.slice(g + 7, g + S).split(".")[0] >= 68 ? y.jcl = !0 : y.jcl = !1
        } else y.jcl = !1
    } else y.unknown = !0;
    var O = y,
        V = {},
        P = function(e) {
            if (0 === Object.keys(V).length) {
                try {
                    var n = JSON.parse(window.PalmSystem.deviceInfo);
                    V.modelName = n.modelName, V.version = n.platformVersion, V.versionMajor = n.platformVersionMajor, V.versionMinor = n.platformVersionMinor, V.versionDot = n.platformVersionDot, V.sdkVersion = n.platformVersion, V.screenWidth = n.screenWidth, V.screenHeight = n.screenHeight
                } catch (e) {
                    V.modelName = "webOS Device"
                }
                V.screenHeight = V.screenHeight || window.screen.height, V.screenWidth = V.screenWidth || window.screen.width, O.tv && (O.jcl ? (new m).send({
                    service: "luna://com.webos.service.config",
                    method: "getConfigs",
                    parameters: {
                        configNames: ["tv.nyx.firmwareVersion", "tv.nyx.platformVersion", "tv.hw.panelResolution", "tv.model.modelname"]
                    },
                    onSuccess: function(n) {
                        if (V.modelName = n.configs["tv.model.modelname"] || V.modelName, V.sdkVersion = n.configs["tv.nyx.platformVersion"] || V.sdkVersion, V.uhd = "UD" === n.configs["tv.hw.panelResolution"], n.configs["tv.nyx.firmwareVersion"] && "0.0.0" !== n.configs["tv.nyx.firmwareVersion"] || (n.configs["tv.nyx.firmwareVersion"] = n.configs["tv.nyx.platformVersion"]), n.configs["tv.nyx.firmwareVersion"]) {
                            V.version = n.configs["tv.nyx.firmwareVersion"];
                            for (var r = V.version.split("."), t = ["versionMajor", "versionMinor", "versionDot"], o = 0; o < t.length; o += 1) try {
                                V[t[o]] = parseInt(r[o], 10)
                            } catch (e) {
                                V[t[o]] = r[o]
                            }
                        }
                        e(V)
                    },
                    onFailure: function() {
                        e(V)
                    }
                }) : (new m).send({
                    service: "luna://com.webos.service.tv.systemproperty",
                    method: "getSystemInfo",
                    parameters: {
                        keys: ["firmwareVersion", "modelName", "sdkVersion", "UHD"]
                    },
                    onSuccess: function(n) {
                        if (V.modelName = n.modelName || V.modelName, V.sdkVersion = n.sdkVersion || V.sdkVersion, V.uhd = "true" === n.UHD, n.firmwareVersion && "0.0.0" !== n.firmwareVersion || (n.firmwareVersion = n.sdkVersion), n.firmwareVersion) {
                            V.version = n.firmwareVersion;
                            for (var r = V.version.split("."), t = ["versionMajor", "versionMinor", "versionDot"], o = 0; o < t.length; o += 1) try {
                                V[t[o]] = parseInt(r[o], 10)
                            } catch (e) {
                                V[t[o]] = r[o]
                            }
                        }
                        e(V)
                    },
                    onFailure: function() {
                        e(V)
                    }
                }))
            } else e(V)
        },
        j = {
            isShowing: function() {
                return PalmSystem && PalmSystem.isKeyboardVisible || !1
            }
        },
        x = function() {
            var e = {};
            if (window.PalmSystem) {
                if (window.PalmSystem.country) {
                    var n = JSON.parse(window.PalmSystem.country);
                    e.country = n.country, e.smartServiceCountry = n.smartServiceCountry
                }
                window.PalmSystem.timeZone && (e.timezone = window.PalmSystem.timeZone)
            }
            return e
        };
    r.d(n, "deviceInfo", function() {
        return P
    }), r.d(n, "fetchAppId", function() {
        return t
    }), r.d(n, "fetchAppInfo", function() {
        return i
    }), r.d(n, "fetchAppRootPath", function() {
        return s
    }), r.d(n, "keyboard", function() {
        return j
    }), r.d(n, "libVersion", function() {
        return "1.2.0"
    }), r.d(n, "platformBack", function() {
        return a
    }), r.d(n, "platform", function() {
        return O
    }), r.d(n, "service", function() {
        return w
    }), r.d(n, "systemInfo", function() {
        return x
    })
}]);