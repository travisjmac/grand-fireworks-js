from __future__ import annotations

import copy
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
from PIL import Image


PASSES = 2
TILE_SIZE = 6
MAX_SAMPLES_PER_PASS = 1800
ERROR_THRESHOLD = 22.0
ICON_BOUNDS = (165, 205, 716, 657)


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def render(svg: Path, png: Path) -> None:
    subprocess.run(
        ["node", "scripts/render-logo-svg.mjs", str(svg), str(png)],
        check=True,
    )


def comparison(source: np.ndarray, rendered: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    alpha = rendered[:, :, 3:4].astype(np.float32) / 255.0
    rendered_rgb = rendered[:, :, :3].astype(np.float32)
    source_rgb = source[:, :, :3].astype(np.float32)
    composite = rendered_rgb * alpha + source_rgb * (1.0 - alpha)
    difference = np.sqrt(np.mean((composite - source_rgb) ** 2, axis=2))
    mask = alpha[:, :, 0] > 0.18
    bounded = np.zeros_like(mask)
    left, top, right, bottom = ICON_BOUNDS
    bounded[top:bottom, left:right] = True
    return difference, mask & bounded


def metrics(difference: np.ndarray, mask: np.ndarray) -> tuple[float, float, int]:
    values = difference[mask]
    if values.size == 0:
        return 0.0, 0.0, 0
    return float(values.mean()), float(np.percentile(values, 95)), int((values > ERROR_THRESHOLD).sum())


def candidate_samples(
    difference: np.ndarray,
    mask: np.ndarray,
) -> list[tuple[float, int, int, int, int]]:
    left, top, right, bottom = ICON_BOUNDS
    candidates: list[tuple[float, int, int, int, int]] = []
    for y in range(top, bottom, TILE_SIZE):
        for x in range(left, right, TILE_SIZE):
            tile_difference = difference[y:min(bottom, y + TILE_SIZE), x:min(right, x + TILE_SIZE)]
            tile_mask = mask[y:min(bottom, y + TILE_SIZE), x:min(right, x + TILE_SIZE)]
            if not tile_mask.any():
                continue
            scored = np.where(tile_mask, tile_difference, -1.0)
            flat_index = int(scored.argmax())
            local_y, local_x = np.unravel_index(flat_index, scored.shape)
            score = float(scored[local_y, local_x])
            if score >= ERROR_THRESHOLD:
                candidates.append(
                    (
                        score,
                        x,
                        y,
                        min(TILE_SIZE, right - x),
                        min(TILE_SIZE, bottom - y),
                    )
                )
    candidates.sort(reverse=True)
    return candidates[:MAX_SAMPLES_PER_PASS]


def write_heatmap(difference: np.ndarray, output: Path) -> None:
    intensity = np.clip(difference * 5.0, 0, 255).astype(np.uint8)
    heatmap = np.zeros((*intensity.shape, 3), dtype=np.uint8)
    heatmap[:, :, 0] = intensity
    heatmap[:, :, 1] = np.clip((intensity.astype(np.int16) - 96) * 2, 0, 255).astype(np.uint8)
    Image.fromarray(heatmap).save(output)


def main(png_name: str, svg_name: str, output_name: str) -> None:
    png_path = Path(png_name)
    svg_path = Path(svg_name)
    output_path = Path(output_name)
    heatmap_path = output_path.with_name(f"{output_path.stem}-difference.png")

    source = np.asarray(Image.open(png_path).convert("RGBA"))
    tree = ET.parse(svg_path)
    root = tree.getroot()
    namespace = root.tag.partition("}")[0].removeprefix("{")
    if namespace:
        ET.register_namespace("", namespace)
        qualify = lambda name: f"{{{namespace}}}{name}"
    else:
        qualify = lambda name: name

    defs = next(child for child in root if local_name(child.tag) == "defs")
    sampled = next(
        element
        for element in root.iter()
        if local_name(element.tag) == "g" and element.get("id") == "png-grid-sampled-icon"
    )
    for child in list(sampled):
        if (child.get("id") or "").startswith("adaptive-corrections-"):
            sampled.remove(child)

    correction_filter = next(
        (element for element in defs if element.get("id") == "adaptive-correction-smoothing"),
        None,
    )
    if correction_filter is None:
        correction_filter = ET.SubElement(
            defs,
            qualify("filter"),
            {
                "id": "adaptive-correction-smoothing",
                "x": "-2%",
                "y": "-2%",
                "width": "104%",
                "height": "104%",
                "color-interpolation-filters": "sRGB",
            },
        )
        ET.SubElement(
            correction_filter,
            qualify("feGaussianBlur"),
            {"stdDeviation": "0.48"},
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)

    with tempfile.TemporaryDirectory() as temporary:
        rendered_path = Path(temporary) / "rendered.png"
        for pass_index in range(PASSES):
            render(output_path, rendered_path)
            rendered = np.asarray(Image.open(rendered_path).convert("RGBA"))
            difference, mask = comparison(source, rendered)
            mean, percentile_95, high_error = metrics(difference, mask)
            candidates = candidate_samples(difference, mask)
            print(
                f"pass={pass_index} mean={mean:.3f} p95={percentile_95:.3f} "
                f"high_error_pixels={high_error} corrections={len(candidates)}"
            )
            if not candidates:
                break
            group = ET.SubElement(
                sampled,
                qualify("g"),
                {
                    "id": f"adaptive-corrections-{pass_index + 1}",
                    "filter": "url(#adaptive-correction-smoothing)",
                    "shape-rendering": "crispEdges",
                },
            )
            subdivisions = pass_index + 2
            for _, tile_x, tile_y, tile_width, tile_height in candidates:
                cell_width = tile_width / subdivisions
                cell_height = tile_height / subdivisions
                for row in range(subdivisions):
                    for column in range(subdivisions):
                        x = tile_x + column * cell_width
                        y = tile_y + row * cell_height
                        sample_x = min(
                            source.shape[1] - 1,
                            max(0, round(x + cell_width / 2)),
                        )
                        sample_y = min(
                            source.shape[0] - 1,
                            max(0, round(y + cell_height / 2)),
                        )
                        red, green, blue, _ = source[sample_y, sample_x]
                        ET.SubElement(
                            group,
                            qualify("rect"),
                            {
                                "x": f"{x:.3f}",
                                "y": f"{y:.3f}",
                                "width": f"{cell_width + 0.03:.3f}",
                                "height": f"{cell_height + 0.03:.3f}",
                                "fill": f"#{red:02x}{green:02x}{blue:02x}",
                            },
                        )
            tree.write(output_path, encoding="utf-8", xml_declaration=True)

        render(output_path, rendered_path)
        final_rendered = np.asarray(Image.open(rendered_path).convert("RGBA"))
        final_difference, final_mask = comparison(source, final_rendered)
        mean, percentile_95, high_error = metrics(final_difference, final_mask)
        write_heatmap(final_difference, heatmap_path)
        print(
            f"final mean={mean:.3f} p95={percentile_95:.3f} "
            f"high_error_pixels={high_error}"
        )
        print(f"heatmap={heatmap_path}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("usage: refine-sampled-logo.py PNG INPUT_SVG OUTPUT_SVG")
    main(sys.argv[1], sys.argv[2], sys.argv[3])
