(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  const number = value => Number(Number(value).toFixed(6));

  const channel = value => Math.max(
    0,
    Math.min(255, Math.round(value > 1 ? value : value * 255))
  );

  const alpha = value => Math.max(
    0,
    Math.min(1, value > 1 ? value / 255 : value)
  );

  function loopsFor(shape) {
    return shape.vectorLoopsToDraw || shape.vectorLoops || [];
  }

  function curvePoints(curve) {
    const points = [];
    const add = (x, y) => {
      if (Number.isFinite(x) && Number.isFinite(y)) points.push([x, y]);
    };

    add(curve.startX, curve.startY);
    add(curve.endX, curve.endY);
    add(curve.controlX, curve.controlY);
    add(curve.controlStartX, curve.controlStartY);
    add(curve.controlEndX, curve.controlEndY);

    if (Number.isFinite(curve.centerX) && Number.isFinite(curve.centerY)) {
      const rx = curve.radiusX ?? curve.radius;
      const ry = curve.radiusY ?? curve.radius;
      if (Number.isFinite(rx) && Number.isFinite(ry)) {
        add(curve.centerX - rx, curve.centerY - ry);
        add(curve.centerX + rx, curve.centerY + ry);
      }
    }

    return points;
  }

  function shapeBounds(loops) {
    const points = loops.flatMap(loop =>
      (loop?.curveLoop?.curves || []).flatMap(curvePoints)
    );

    if (!points.length) return null;

    return points.reduce((bounds, [x, y]) => ({
      minX: Math.min(bounds.minX, x),
      minY: Math.min(bounds.minY, y),
      maxX: Math.max(bounds.maxX, x),
      maxY: Math.max(bounds.maxY, y)
    }), {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    });
  }

  function isCanvasBackground(bounds, width, height) {
    if (!bounds) return false;

    const tolerance = Math.max(2, Math.min(width, height) * 0.005);
    const coverageX = (bounds.maxX - bounds.minX) / width;
    const coverageY = (bounds.maxY - bounds.minY) / height;

    return coverageX >= 0.98 &&
      coverageY >= 0.98 &&
      bounds.minX <= tolerance &&
      bounds.minY <= tolerance &&
      bounds.maxX >= width - tolerance &&
      bounds.maxY >= height - tolerance;
  }

  function rgbFor(rgba) {
    return [channel(rgba.r), channel(rgba.g), channel(rgba.b)];
  }

  function colorDistance(left, right) {
    return Math.hypot(
      left[0] - right[0],
      left[1] - right[1],
      left[2] - right[2]
    );
  }

  function loopPath(loop) {
    const curves = loop?.curveLoop?.curves || [];
    if (!curves.length) return "";

    let path = `M ${number(curves[0].startX)} ${number(curves[0].startY)}`;

    for (const curve of curves) {
      if (!curve) continue;

      if (
        curve.controlX !== undefined &&
        curve.controlStartX === undefined &&
        curve.centerX === undefined
      ) {
        path += ` Q ${number(curve.controlX)} ${number(curve.controlY)}`;
        path += ` ${number(curve.endX)} ${number(curve.endY)}`;
      } else if (
        curve.controlStartX !== undefined &&
        curve.centerX === undefined
      ) {
        path += ` C ${number(curve.controlStartX)} ${number(curve.controlStartY)}`;
        path += ` ${number(curve.controlEndX)} ${number(curve.controlEndY)}`;
        path += ` ${number(curve.endX)} ${number(curve.endY)}`;
      } else if (
        curve.centerX !== undefined &&
        (curve.radius !== undefined || curve.radiusX !== undefined)
      ) {
        const rx = curve.radiusX ?? curve.radius;
        const ry = curve.radiusY ?? curve.radius;
        const rotation = number((curve.rotationRad || 0) * 180 / Math.PI);

        if (rx > 0.001 && ry > 0.001) {
          path += ` A ${number(rx)} ${number(ry)} ${rotation}`;
          path += ` ${curve.isLargeArc ? 1 : 0} ${curve.isClockwise ? 1 : 0}`;
          path += ` ${number(curve.endX)} ${number(curve.endY)}`;
        } else {
          path += ` L ${number(curve.endX)} ${number(curve.endY)}`;
        }
      } else {
        path += ` L ${number(curve.endX)} ${number(curve.endY)}`;
      }
    }

    return `${path} Z`;
  }

  window.vi2svg = (
    vectorImage,
    filename = "vector-image",
    { removeBackground = true, backgroundTolerance = 45 } = {}
  ) => {
    if (!vectorImage?.isReady) {
      console.error("VectorImage not ready");
      return null;
    }

    const width = vectorImage.imageWidth;
    const height = vectorImage.imageHeight;
    const svg = document.createElementNS(SVG_NS, "svg");

    svg.setAttribute("xmlns", SVG_NS);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Grand Fireworks logo");

    const shapes = (vectorImage.vectorShapes || []).filter(Boolean);
    const canvasShape = removeBackground
      ? shapes.find(shape =>
          isCanvasBackground(shapeBounds(loopsFor(shape)), width, height)
        )
      : null;
    const backgroundRgb = canvasShape
      ? rgbFor(vectorImage.userPalette.getMutRgba(canvasShape.paletteIndex))
      : null;

    let renderRoot = svg;
    let mask = null;

    if (backgroundRgb) {
      const defs = document.createElementNS(SVG_NS, "defs");
      mask = document.createElementNS(SVG_NS, "mask");
      const maskBase = document.createElementNS(SVG_NS, "rect");
      const content = document.createElementNS(SVG_NS, "g");

      mask.setAttribute("id", "grand-fireworks-transparent-cutouts");
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      mask.setAttribute("x", 0);
      mask.setAttribute("y", 0);
      mask.setAttribute("width", width);
      mask.setAttribute("height", height);

      maskBase.setAttribute("x", 0);
      maskBase.setAttribute("y", 0);
      maskBase.setAttribute("width", width);
      maskBase.setAttribute("height", height);
      maskBase.setAttribute("fill", "#ffffff");
      mask.appendChild(maskBase);

      defs.appendChild(mask);
      svg.appendChild(defs);
      content.setAttribute("mask", "url(#grand-fireworks-transparent-cutouts)");
      svg.appendChild(content);
      renderRoot = content;
    }

    let pathCount = 0;
    let skippedBackgrounds = 0;
    let transparentCutouts = 0;

    for (const shape of shapes) {
      const rgba = vectorImage.userPalette.getMutRgba(shape.paletteIndex);
      const opacity = alpha(rgba.a);
      if (opacity === 0) continue;

      const loops = loopsFor(shape);
      if (!loops.length) continue;

      if (removeBackground && isCanvasBackground(shapeBounds(loops), width, height)) {
        skippedBackgrounds++;
        continue;
      }

      // Keep all loops belonging to a shape in one compound path. Using evenodd
      // preserves holes in letters such as A, D, R and O as transparency.
      const pathData = loops.map(loopPath).filter(Boolean).join(" ");
      if (!pathData) continue;

      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", pathData);
      path.setAttribute(
        "fill",
        `rgb(${channel(rgba.r)} ${channel(rgba.g)} ${channel(rgba.b)})`
      );
      path.setAttribute("fill-rule", "evenodd");
      path.setAttribute("clip-rule", "evenodd");
      path.setAttribute("stroke", "none");

      if (
        mask &&
        backgroundRgb &&
        colorDistance(rgbFor(rgba), backgroundRgb) <= backgroundTolerance
      ) {
        path.setAttribute("fill", "#000000");
        path.removeAttribute("fill-opacity");
        mask.appendChild(path);
        transparentCutouts++;
        continue;
      }

      if (opacity < 1) path.setAttribute("fill-opacity", number(opacity));

      renderRoot.appendChild(path);
      pathCount++;
    }

    const svgString = `<?xml version="1.0" encoding="UTF-8"?>\n${svg.outerHTML}`;
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename.toLowerCase().endsWith(".svg")
      ? filename
      : `${filename}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    console.log(
      `Exported ${pathCount} compound paths; removed ${skippedBackgrounds} canvas background shape(s) and masked ${transparentCutouts} background-edge shape(s).`
    );

    return svgString;
  };

  console.log("vi2svg(vectorImage, filename, options) ready");
  console.log("Example: vi2svg(this, 'grand-fireworks-logo-193-colour')");
})();
