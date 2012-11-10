/*
    vivi.js
    Copyright (c) 2012, musictheory.net, LLC.  All rights reserved.

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

var vivi = (function() { "use strict";
    var _styleSheet,
        _detector,
        _didInit,
        _keyframeKeyword,
        _keyframesRuleNumber,
        _namePrefix         = "vivi-js-",
        _supported          = false,
        _counter            = 1,
        _cssPropertyNameMap = { },
        _allElements        = [ ],  // synced with _allStates
        _allStates          = [ ],  // synced with _allElements
        _idToStateMap       = { };


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


    function _cloneStyle(style)
    {
        var result = { },
            key, value;

        for (key in style) { if (has(style, key)) {
            if (key.match(/^[0-9]+$/)) continue;

            value = style[key];

            if (typeof value == "string") {
                result[key] = value;
            }
        }}

        return result;
    }


    function _diffStyles(styleA, styleB, preferB)
    {
        var result = { },
            key, valueA, valueB;

        for (key in (preferB ? styleB : styleA)) { if (has(styleA, key) && has(styleB, key)) {
            valueA = styleA[key];
            valueB = styleB[key];

            if (valueA != valueB) {
                result[key] = (preferB ? valueB : valueA);
            }
        }}

        return result;
    }


    function _resolveCSSPropertyName(originalName)
    {
        var name, style, result, key, originalKey, delta, prefix, index;

        if (!_detector) {
            _detector = document.createElement("div");
        }

        result = _cssPropertyNameMap[originalName];
        if (result) return result;

        name  = originalName.replace("-", "").toLowerCase();
        style = _detector.style;

        for (originalKey in style) {
            if (typeof style[originalKey] == "string") {
                key   = originalKey.replace("-", "").toLowerCase();
                delta = key.length - name.length;

                index = key.indexOf(name, delta);
                if (index >= 0 ) {
                    prefix = originalKey.slice(0, index);

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
        var keyframesRule = _appendRule(_keyframeKeyword + " " + name + "{}"),
            keyframe, key, percentKey, cssText, keyframeRule, prop;

        for (key in keyframes) { if (has(keyframes, key)) {
            keyframe   = keyframes[key];
            key        = _resolveKey(key);
            percentKey = Math.round(key * 100) + "%";
            cssText    = percentKey + "{ }";

            // 5.3.3 defines appendRule() function on CSSKeyframesRule
            if (keyframesRule.appendRule) {
                keyframesRule.appendRule(cssText);

            // Older WebKit used insertRule() instead.  https://bugs.webkit.org/show_bug.cgi?id=57910
            } else {
                keyframesRule.insertRule(cssText);
            }

            keyframeRule = keyframesRule.findRule(key);
            if (!keyframeRule) {
                keyframeRule = keyframesRule.findRule(percentKey);
            }

            if (typeof keyframe == "string") {
                keyframeRule.style.cssText = keyframe;

            } else {
                for (prop in keyframe) { if (has(keyframe, prop)) {
                    keyframeRule.style[ _resolveCSSPropertyName(prop) ] = keyframe[prop];
                }}
            }
        }}
    }


    function _removeKeyframesRule(name)
    {
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

        var styleElement = document.createElement("style"),
            headElement  = document.getElementsByTagName("head")[0],
            arr, value, i, length, rule;

        styleElement.type  = "text/css";
        styleElement.title = "vivi.js";

        headElement.appendChild(styleElement);

        for (i = 0, length = document.styleSheets.length; i < length; i++) {
            if (document.styleSheets[i].title == "vivi.js") {
                _styleSheet = document.styleSheets[i];
                break;
            }
        }

        arr = [ "@keyframes", "@-webkit-keyframes", "@-moz-keyframes", "@-o-keyframes" ];
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


    function _handleAnimationEvent(event)
    {
        var animationName = event.animationName,
            state, type, callbackObject;

        if (animationName.indexOf(_namePrefix) === 0) {
            state = _idToStateMap[animationName.slice(_namePrefix.length)];

            if (state) {
                type = event.type;

                if      (type.match(/start$/i)    )  type = "start";
                else if (type.match(/iteration$/i))  type = "iteration";
                else if (type.match(/end$/i)      )  type = "end";
                else                                 type = "unknown";

                callbackObject = { 
                    id: state.id,
                    event: event,
                    type: type
                }
                if (state.info) callbackObject.info = state.info;

                if (state.callback) {
                    state.callback(callbackObject);
                }

                if (state.completion && event.type.match(/end$/i)) {
                    state.completion(!state.cancelled, callbackObject);
                }

                if (type == "end") {
                    if (state.remove) {
                        _cleanup(state.id)
                    }
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
        var names           = [ ],
            durations       = [ ],
            timingFunctions = [ ],
            iterationCounts = [ ],
            directions      = [ ],
            delays          = [ ],
            fillModes       = [ ],
            playStates      = [ ],
            style;

        states.forEach(function(state) {
            var playState = state.pauseCount ? "paused" : "running";

            names          .push( state.name                       );
            durations      .push( state.duration       || "0s"     );
            delays         .push( state.delay          || "0s"     );
            directions     .push( state.direction      || "normal" );
            timingFunctions.push( state.timingFunction || "ease"   );
            iterationCounts.push( state.iterationCount || "1"      );
            fillModes      .push( state.fillMode       || "none"   );
            playStates     .push( playState                        );
        });

        style = element.style;
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
        var state = _idToStateMap[id],
            element, index, states;

        if (state) {
            element = state.element;
            index   = _allElements.indexOf(element);
            states  = _allStates[index];

            state.pauseCount = (state.pauseCount || 0) + direction;
            _updateAnimationProperties(element, states);
        }
    }


    function _cleanup(id)
    {
        var state   = _idToStateMap[id],
            element = state.element,
            index   = _allElements.indexOf(element),
            states  = _allStates[index];

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

        if (state.keyframes) {
            _removeKeyframesRule(state.animationName);
        }

        delete(_idToStateMap[id]);
    }


    function supported()
    {
        if (!_didInit) _init();
        return _supported;
    }


    function start(args)
    {
        if (!_didInit)   _init();
        if (!_supported) _throw("native CSS animations not supported");

        var id        = _counter++,
            element   = args.element,
            keyframes = args.keyframes,
            name      = _namePrefix + id,
            state, states, onEnd, index, key;

        if (!element) _throw("start(): element is " + element);

        // Allow Array-like objects containing exactly one HTMLElement
        if (!(element instanceof HTMLElement)) {
            if ((element.length === 1) && (element[0] instanceof HTMLElement)) {
                element = element[0];
            } else {
                _throw("element is unknown object: " + element);
            }
        }


        function getComputed(other)
        {
            var computed = window.getComputedStyle(element);
            var result   = { };

            for (var key in other) { if (has(other, key)) {
                result[key] = computed[key];
            }}

            return result;
        }


        function addCommon(keyframes, common)
        {
            common = _resolveAllCSSPropertyNames(common);

            for (var c in common) {
                for (var k in keyframes) { if (keyframes.hasOwnProperty(k)) {
                    if (!keyframes[k][c]) {
                        keyframes[k][c] = common[c];
                    }
                }}
            }
        }
        

        if (!keyframes) {
            keyframes = { };

            if (args.to && args.from) {
                keyframes.to   = args.to;
                keyframes.from = args.from;
            } else {
                if (args.from) {
                    keyframes.from = _resolveAllCSSPropertyNames(args.from);
                    keyframes.to   = getComputed(keyframes.from);

                } else if (args.to) {
                    keyframes.to   = _resolveAllCSSPropertyNames(args.to);
                    keyframes.from = getComputed(keyframes.to);
                }
            }
        }

        if (args.common) {
            addCommon(keyframes, args.common);
        }

        _idToStateMap[id] = state = {
            id: id,
            element:   element,
            name:      name,
            keyframes: keyframes
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
        } else if (state.fillMode == "forwards" || state.fillMode == "both") {
            state.remove = false;
        } else {
            state.remove = true;
        }

        if (typeof state.duration == "number") {
            state.duration += "ms";
        }

        if (typeof state.delay == "number") {
            state.delay += "ms";
        }

        _appendKeyframesRule(name, keyframes);

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
        var state = _idToStateMap[id];

        if (state) {
            state.cancelled = true;
            _cleanup(id);
        }
    }


    return {
        supported: supported,
        start:  start,
        cancel: cancel,
        pause:  function(id) { _pauseOrResume(id,  1); },
        resume: function(id) { _pauseOrResume(id, -1); }
    };

}());
