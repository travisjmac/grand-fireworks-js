import { template as _$template } from "solid-js/web";
import { style as _$style } from "solid-js/web";
import { className as _$className } from "solid-js/web";
import { setAttribute as _$setAttribute } from "solid-js/web";
import { effect as _$effect } from "solid-js/web";
import { insert as _$insert } from "solid-js/web";
import { use as _$use } from "solid-js/web";
var _tmpl$ = /*#__PURE__*/_$template(`<div>`);
import { createEffect, onCleanup, onMount } from 'solid-js';
import GrandFireworksEngine from 'grand-fireworks-js';
function libraryOptions(options) {
  const next = {
    ...(options || {})
  };
  delete next.container;
  delete next.autoStart;
  return next;
}
export default function GrandFireworks(props) {
  let container;
  let fireworks = null;
  onMount(() => {
    fireworks = new GrandFireworksEngine({
      ...libraryOptions(props.options),
      container,
      autoStart: false
    });
    if (props.autoStart) fireworks.start();
    if (typeof props.ref === 'function') props.ref(fireworks);
  });
  createEffect(() => {
    const options = props.options;
    if (!fireworks) return;
    fireworks.setOptions(libraryOptions(options));
  });
  onCleanup(() => {
    if (typeof props.ref === 'function') props.ref(null);
    if (fireworks) fireworks.destroy();
    fireworks = null;
  });
  return (() => {
    var _el$ = _tmpl$();
    var _ref$ = container;
    typeof _ref$ === "function" ? _$use(_ref$, _el$) : container = _el$;
    _$insert(_el$, () => props.children);
    _$effect(_p$ => {
      var _v$ = props.id,
        _v$2 = props.class,
        _v$3 = props.style;
      _v$ !== _p$.e && _$setAttribute(_el$, "id", _p$.e = _v$);
      _v$2 !== _p$.t && _$className(_el$, _p$.t = _v$2);
      _p$.a = _$style(_el$, _v$3, _p$.a);
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined
    });
    return _el$;
  })();
}
export { GrandFireworks };
