# vivi.js

Tiny Javascript wrapper for CSS Defined Animations (@keyframes).  Allows you to start/cancel/pause/unpause
CSS animations from JavaScript.  Works in Safari/Chrome/Firefox.  Probably works in IE10, but I need to install Windows 8 ;)


## Overview

Trying to create/kickoff/pause/resume @keyframe animations from JavaScript was painful.  I couldn't find an
existing library which used CSS Animations (only CSS Transitions).  I had a very large quadruple latte.  I wrote this.


## API


vivi.supported()
----------

Returns true if the browser supports CSS3 animations, false otherwise.
If supported=false, calling `vivi.start()` will throw an error.

===



vivi.start()
----------

Starts an animation

### Signature

```javascript
vivi.start(options) // Returns an animation id
```

### `options` keys: base

- `element` (element, required) - The element to animate
- `to`, `from`, `keyframes` (object) - Keyframe information.  At least one of these keys is required.

The `keyframes` key takes priority.  When it is present, any `to` and/or `from` keys on the `options` object is ignored.
The contents of the keyframes object are used to directly create the CSS @keyframes rule.  This allows the creation of
complex animations with more than a simple to/from state.

As a convinience, `to` and `from` keys may be specified on the `options` object.  If both are present (`from: { '...' }, to: { '...' }`),
it is equivalent to `keyframes: { from: { '...' }, to: { '...' } }`

If only `to` or only `from` is present, the element's computed style is used for the other.


### `options` keys: animation properties
- `duration` (string or number) - [Duration](http://www.w3.org/TR/css3-animations/#animation-duration-property) of the animation, either a number of milliseconds, or a CSS time value.  Defaults to "0s".
- `delay` (string or number) - [Delay](http://www.w3.org/TR/css3-animations/#animation-delay-property) of the animation, either a number of milliseconds, or a CSS time value.  Defaults to "0s".
- `direction` (string) - [Direction](http://www.w3.org/TR/css3-animations/#animation-direction-property) of the animation.  Defaults to "normal".
- `timingFunction` or `"timing-function"` (string) - [Timing function](http://www.w3.org/TR/css3-animations/#animation-timing-function-property) for the animation. Defaults to "ease".
- `iterationCount` or `"iteration-count"` (string or number) - [Iteration count](http://www.w3.org/TR/css3-animations/#animation-iteration-count-property) of the animation.  Defaults to 1.
- `fillMode` or `"fill-mode"` (string) - [Fill mode]() of the animation.  Defaults to "none".

### `options` keys: callbacks

- `callback` (function) - Callback function
- `completion` (function) - Simplified UIKit-inspired callback function for when the animation ends
- `info` (object) - Any object you want.  Available during callbacks as `options.info`.


### Example
```javascript
var theAnimationId = vivi.start({
    element: document.getElementById("thing"),

    // Keyframes
    from: { "transform": "translate3d(0,0,0)" },
    to:   { "transform": "translate3d(0,0,0) rotate(90deg)" },

    // Animation properties
    duration: "1s",
    delay: 500,
    timingFunction: "ease-in-out",

    // Standard callback function
    callback: function(options) {
        if (options.type == "start") console.log("thing's animation is starting!");
        if (options.type == "end")   console.log("thing's animation is done!");
    },

    // Alternate, simplified callback 
    completion: function(finished, options) {
        console.log("things animation completed.  finished=" + finished);
    }
});
```

===

vivi.cancel()
----------

Cancels an animation

```javascript
vivi.cancel(id)
```

### Arguments
`id` (number) - The animation id (returned by `vivi.start`) to cancel.

===

vivi.pause()
----------

Pauses an animation, nestable

```javascript
vivi.pause(id)
```

### Arguments
`id` (number) - The animation id (returned by `vivi.start`) to pause.

===

vivi.resume()
----------

Resumes a previously paused animation, nestable

```javascript
vivi.resume(id)
```

### Arguments
`id` (number) - The animation id (returned by `vivi.start`) to resume.

===

