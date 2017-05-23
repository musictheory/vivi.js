/*
    vivi.js
    Copyright (c) 2012-2013, musictheory.net, LLC.  All rights reserved.

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:
        * Redistributions of source code must retain the above copyright
          notice, this list of conditions and the following disclaimer.
        * Redistributions in binary form must reproduce the above copyright
          notice, this list of conditions and the following disclaimer in the
          documentation and/or other materials provided with the distribution.
        * Neither the name of musictheory.net, LLC nor the names of its contributors
          may be used to endorse or promote products derived from this software
          without specific prior written permission.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
    ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
    WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
    DISCLAIMED. IN NO EVENT SHALL MUSICTHEORY.NET, LLC BE LIABLE FOR ANY
    DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
    (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
    LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
    ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
    SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

;(function() { "use strict";


var root = this;

var _styleSheet;
var _detector;
var _didInit;
var _debug;
var _keyframeKeyword;
var _keyframesRuleNumber;
var _namePrefix         = "vivi-js-";
var _supported          = false;
var _counter            = 1;
var _cssPropertyNameMap = { };
var _allElements        = [ ];  // synced with _allStates
var _allStates          = [ ];  // synced with _allElements
var _idToStateMap       = { };
var _inflightAndNamed   = [ ];


function has(obj, prop)
{
    return Object.prototype.hasOwnProperty.call(obj, prop);
}


function _appendRule(cssText)
{
    var i = _styleSheet.cssRules.length;

    try {
        _styleSheet.insertRule(cssText, i);
    } catch(e) {
        return false;
    }

    return _styleSheet.cssRules[i];
}


function _log()
{
    var a = Array.prototype.slice.call(arguments);
    a.unshift("vivi.js:");
    if (console.log) console.log.apply(console, a);
}


function _throw(str)
{
    throw new Error("vivi.js: " + str);
}


function _resolveKey(key)
{
    if (key == "from") {
        return "0";
    } else if (key == "to") {
        return "1";
    } else if (key.indexOf("%") >= 0) {
        return parseFloat(key) / 100;
    }

    return parseFloat(key);
}


function _resolveCSSPropertyName(originalName)
{
    if (!_detector) {
        _detector = document.createElement("div");
    }

    var result = _cssPropertyNameMap[originalName];
    if (result) return result;

    var name  = originalName.replace("-", "").toLowerCase();
    var style = _detector.style;

    for (var originalKey in style) {
        if (typeof style[originalKey] == "string") {
            var key   = originalKey.replace("-", "").toLowerCase();
            var delta = key.length - name.length;

            var index = key.indexOf(name, delta);
            if (index >= 0 ) {
                var prefix = originalKey.slice(0, index);

                if (!prefix || prefix == "webkit" || prefix == "moz" || prefix == "ms" || prefix == "o") {
                    _cssPropertyNameMap[originalName] = originalKey;
                    result = originalKey;
                    break;
                }
            }
        }
    }

    return result;
}


function _resolveAllCSSPropertyNames(object)
{
    var result = { };

    for (var key in object) { if (has(object, key)) {
        result[ _resolveCSSPropertyName(key) ] = object[key];
    }}

    return result;
}


function _appendKeyframesRule(name, keyframes)
{
    if (_debug) _log("Appending @keyframes", name, keyframes);

    var keyframesRule = _appendRule(_keyframeKeyword + " " + name + "{}");

    for (var key in keyframes) { if (has(keyframes, key)) {
        var keyframe = keyframes[key];
        key = _resolveKey(key);

        var percentKey = Math.round(key * 100) + "%";
        var cssText    = percentKey + "{ }";

        // 5.3.3 defines appendRule() function on CSSKeyframesRule
        if (keyframesRule.appendRule) {
            keyframesRule.appendRule(cssText);

        // Older WebKit used insertRule() instead.  https://bugs.webkit.org/show_bug.cgi?id=57910
        } else {
            keyframesRule.insertRule(cssText);
        }

        var keyframeRule = keyframesRule.findRule(percentKey);

        if (typeof keyframe == "string") {
            keyframeRule.style.cssText = keyframe;

        } else {
            for (var prop in keyframe) { if (has(keyframe, prop)) {
                keyframeRule.style[ _resolveCSSPropertyName(prop) ] = keyframe[prop];
            }}
        }
    }}
}


function _removeKeyframesRule(name)
{
    if (_debug) _log("Removing @keyframes", name);

    for (var i = 0; i < _styleSheet.cssRules.length; i++) {
        var rule = _styleSheet.cssRules[i];

        if (rule.type === _keyframesRuleNumber && rule.name == name) {
            _styleSheet.deleteRule(i--);
        }
    }
}


function _init()
{
    _didInit = true;

    // Bail if we have no style["animation"] 
    if (!_resolveCSSPropertyName("animation")) {
        return;
    }

    var styleElement = document.createElement("style");
    var headElement  = document.head || document.getElementsByTagName("head")[0];
    var i, length, value, rule;

    headElement.appendChild(styleElement);

    _styleSheet = styleElement.sheet;
    if (!_styleSheet) return;

    var arr = [ "@keyframes", "@-webkit-keyframes", "@-moz-keyframes", "@-o-keyframes" ];
    for (i = 0, length = arr.length; i < length; i++) {
        value = arr[i];

        if ((rule = _appendRule(value + " vivi-js-init {}"))) {
            // Make sure the needed CSSOM functions are available 
            if ((rule.insertRule || rule.appendRule) && rule.findRule) {
                _keyframeKeyword = value;
            }

            _removeKeyframesRule("vivi-js-init");
            break;
        }
    }

    if (_keyframeKeyword === undefined) {
        return;
    }

    arr = [ "KEYFRAMES_RULE", "WEBKIT_KEYFRAMES_RULE", "MOZ_KEYFRAMES_RULE", "O_KEYFRAMES_RULE" ];
    for (i = 0, length = arr.length; i < length; i++) {
        value = arr[i];

        if (window.CSSRule && window.CSSRule[value] !== undefined) {
            _keyframesRuleNumber = window.CSSRule[value];
            break;
        }
    }

    if (_keyframesRuleNumber === undefined) {
        _keyframesRuleNumber = 7;
    }

    _supported = true;
}


function _getInflightIdByElementAndName(element, animationName, remove)
{
    var i, length, result;

    for (i = 0, length = _inflightAndNamed.length; i < length; i++) {
        var data = _inflightAndNamed[i];

        if (element == data[0] && animationName == data[1]) {
            result = data[2];
            break;
        }
    }

    if (result && remove) {
        _inflightAndNamed.splice(i, 1);
    }

    return result;
}


function _handleAnimationEvent(event)
{
    var animationName = event.animationName;

    var type  = event.type;
    var isEnd = false;

    if      (type.match(/start$/i)    )  { type = "start";             }
    else if (type.match(/iteration$/i))  { type = "iteration";         }
    else if (type.match(/end$/i)      )  { type = "end"; isEnd = true; }
    else                                 { type = "unknown";           }

    var id;
    if (animationName.indexOf(_namePrefix) === 0) {
        id = animationName.slice(_namePrefix.length);
    } else {
        id = _getInflightIdByElementAndName(event.target, animationName, isEnd);
    }

    if (!id) return;

    var state = _idToStateMap[id];
    if (!state) return;

    var callbackObject = { 
        id: state.id,
        event: event,
        type: type
    }
    if (state.info) callbackObject.info = state.info;

    if (state.callback) {
        state.callback(callbackObject);
    }

    if (isEnd) {
        if (_debug) _log(id, ", ", animationName, "ended");

        if (state.completion) {
            state.completion(!state.cancelled, callbackObject);
        }

        if (type == "end") {
            if (state.remove) {
               _cleanup(state.id)
            }
        }
    }
}


function _updateEventListeners(element, shouldAdd)
{
    var events = [
        "animationstart",     "webkitAnimationStart",     "oanimationstart",
        "animationiteration", "webkitAnimationIteration", "oanimationiteration",
        "animationend",       "webkitAnimationEnd",       "oanimationend"
    ];

    for (var i = 0, length = events.length; i < length; i++) {
        if (shouldAdd) {
            element.addEventListener(events[i], _handleAnimationEvent);
        } else {
            element.removeEventListener(events[i], _handleAnimationEvent);
        }
    }
}


function _updateAnimationProperties(element, states)
{
    var names           = [ ];
    var durations       = [ ];
    var timingFunctions = [ ];
    var iterationCounts = [ ];
    var directions      = [ ];
    var delays          = [ ];
    var fillModes       = [ ];
    var playStates      = [ ];

    states.forEach(function(state) {
        var playState = state.pauseCount ? "paused" : "running";

        names          .push( state.name                       );
        durations      .push( state.duration       || "0s"     );
        delays         .push( state.delay          || "0s"     );
        directions     .push( state.direction      || "normal" );
        timingFunctions.push( state.timingFunction || "ease"   );
        iterationCounts.push( state.iterationCount || "1"      );
        fillModes      .push( state.fillMode       || "both"   );
        playStates     .push( playState                        );
    });

    var style = element.style;
    style[ _resolveCSSPropertyName( "animationName"           ) ] = names.join(",");
    style[ _resolveCSSPropertyName( "animationDuration"       ) ] = durations.join(",");
    style[ _resolveCSSPropertyName( "animationDelay"          ) ] = delays.join(",");
    style[ _resolveCSSPropertyName( "animationDirection"      ) ] = directions.join(",");
    style[ _resolveCSSPropertyName( "animationTimingFunction" ) ] = timingFunctions.join(",");
    style[ _resolveCSSPropertyName( "animationIterationCount" ) ] = iterationCounts.join(",");
    style[ _resolveCSSPropertyName( "animationFillMode"       ) ] = fillModes.join(",");
    style[ _resolveCSSPropertyName( "animationPlayState"      ) ] = playStates.join(",");
}


function _pauseOrResume(id, direction)
{
    var state = _idToStateMap[id];

    if (state) {
        var element = state.element;
        var index   = _allElements.indexOf(element);
        var states  = _allStates[index];

        state.pauseCount = (state.pauseCount || 0) + direction;
        _updateAnimationProperties(element, states);
    }
}


function _cleanup(id)
{
    if (_debug) _log("_cleanup(" + id + ")");

    var state   = _idToStateMap[id];
    var element = state.element;
    var index   = _allElements.indexOf(element);
    var states  = _allStates[index];

    if (states.length === 1) {
        _allElements.splice(index, 1);
        _allStates.splice(index, 1);
        _updateEventListeners(element, false);

        states = [ ];

    } else {
        index = states.indexOf(state);
        states.splice(index, 1);
    }

    _updateAnimationProperties(element, states);

    if (state.isTempRule) {
        _removeKeyframesRule(state.name);
    }

    delete(_idToStateMap[id]);
}


function supported()
{
    if (!_didInit) _init();
    return _supported;
}


function define(name, keyframes)
{
    if (_debug) _log("_define(", name, ", ", keyframes, ")");
    _appendKeyframesRule(name, keyframes);
}


function start(element, args)
{
    if (!_didInit)   _init();
    if (!_supported) _throw("native CSS animations not supported");

    // Allow vivi.start({ element: e, ... })
    if (!(element instanceof HTMLElement) && !args) {
        args = element;
        element = args.element;
    }

    var id         = _counter++;
    var keyframes  = args.keyframes;
    var name       = args.name;
    var isTempRule = false;
    var state, states, onEnd, index, key;

    if (!element) _throw("start(): element is " + element);

    if (name) {
        _inflightAndNamed.push([ element, name, id ]);
    }

    // Allow Array-like objects containing exactly one HTMLElement
    if (!(element instanceof HTMLElement)) {
        if ((element.length === 1) && (element[0] instanceof HTMLElement)) {
            element = element[0];
        } else {
            _throw("element is unknown object: " + element);
        }
    }

    if (!name) {
        name = _namePrefix + id;
        isTempRule = true;

        if (!keyframes && !args.to && !args.from) {
            _throw("'name', 'keyframes', 'from', or 'to' must be present in options");
        }
    }

    if (_debug) _log("starting ", id, ", ", name);

    if (!keyframes && (args.to || args.from)) {
        keyframes = {
            to:   args.to,
            from: args.from
        };
    }

    _idToStateMap[id] = state = {
        id:         id,
        element:    element,
        name:       name,
        isTempRule: isTempRule
    };

    if (args.info)               state.info           = args.info;
    if (args.duration)           state.duration       = args.duration;
    if (args.delay)              state.delay          = args.delay;
    if (args.direction)          state.direction      = args.direction;
    if (args["timing-function"]) state.timingFunction = args["timing-function"];
    if (args["iteration-count"]) state.iterationCount = args["iteration-count"];
    if (args["fill-mode"])       state.fillMode       = args["fill-mode"];
    if (args.timingFunction)     state.timingFunction = args.timingFunction;
    if (args.iterationCount)     state.iterationCount = args.iterationCount;
    if (args.fillMode)           state.fillMode       = args.fillMode;
    if (args.callback)           state.callback       = args.callback;
    if (args.completion)         state.completion     = args.completion;

    if (args.remove !== undefined) {
        state.remove = args.remove;
    } else {
        state.remove = true;
    }

    if (typeof state.duration == "number") {
        state.duration += "ms";
    }

    if (typeof state.delay == "number") {
        state.delay += "ms";
    }

    if (keyframes) {
        _appendKeyframesRule(name, keyframes);
    }

    // If _allElements already contains this element, look up the
    // associated states array in _allStates and push the new 
    // state onto it
    //
    if ((index = _allElements.indexOf(element)) >= 0) {
        states = _allStates[index];
        states.push(state);

    // Else, push the element and state and start observing
    //
    } else {
        states = [ state ];
        index = _allElements.length;

        _allElements.push(element);
        _allStates.push(states);
        _updateEventListeners(element, true);
    }

    _updateAnimationProperties(element, states);

    return id;
}


function cancel(id)
{
    if (_debug) _log("_cancel(", id, ")");

    var state = _idToStateMap[id];

    if (state) {
        state.cancelled = true;
        _cleanup(id);
    }
}


var vivi = {
    supported: supported,

    debug: function() { _debug = true; },

    define:  define,

    start:   start,
    animate: start,

    cancel:  cancel,
    stop:    cancel,

    pause:  function(id) { _pauseOrResume(id,  1); },
    resume: function(id) { _pauseOrResume(id, -1); }
};

if (typeof module != "undefined" && typeof module != "function") { module.exports = vivi; }
else if (typeof define === "function" && define.amd) { define(vivi); }
else { root.vivi = vivi; }

}).call(this);
