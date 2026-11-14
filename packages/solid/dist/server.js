import { ssr as _$ssr } from "solid-js/web";
import { ssrStyle as _$ssrStyle } from "solid-js/web";
import { ssrAttribute as _$ssrAttribute } from "solid-js/web";
import { escape as _$escape } from "solid-js/web";
var _tmpl$ = ["<div", " style=\"", "\">", "</div>"];
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
  return _$ssr(_tmpl$, _$ssrAttribute("id", _$escape(props.id, true), false) + _$ssrAttribute("class", _$escape(props.class, true), false), _$ssrStyle(props.style), _$escape(props.children));
}
export { GrandFireworks };
