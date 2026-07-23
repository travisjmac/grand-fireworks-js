from __future__ import annotations

import copy
import math
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image


GRID_COLUMNS = 100
GRID_ROWS = 100
ICON_RIGHT_EDGE = 710.0
EDGE_SEARCH_RADIUS = 10
EDGE_SAMPLE_SPACING = 3.0
EDGE_SAMPLE_RADIUS = 2.15
TOKEN = re.compile(r"[MLAQCZ]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[Ee][-+]?\d+)?")
PARAMETERS = {"M": 2, "L": 2, "A": 7, "Q": 4, "C": 6}


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def is_background(pixel: tuple[int, int, int]) -> bool:
    red, green, blue = pixel
    return max(red, green, blue) < 78 and blue > red * 1.15


def nearest_foreground(
    pixels,
    x: int,
    y: int,
    width: int,
    height: int,
) -> tuple[int, int, int]:
    original = pixels[x, y]
    if not is_background(original):
        return original
    for radius in range(1, EDGE_SEARCH_RADIUS + 1):
        candidates = []
        left = max(0, x - radius)
        right = min(width - 1, x + radius)
        top = max(0, y - radius)
        bottom = min(height - 1, y + radius)
        for sample_x in range(left, right + 1):
            candidates.append((sample_x, top))
            candidates.append((sample_x, bottom))
        for sample_y in range(top + 1, bottom):
            candidates.append((left, sample_y))
            candidates.append((right, sample_y))
        for sample_x, sample_y in candidates:
            candidate = pixels[sample_x, sample_y]
            if not is_background(candidate):
                return candidate
    return original


def median_foreground(
    pixels,
    x: int,
    y: int,
    width: int,
    height: int,
    radius: int = 3,
) -> tuple[int, int, int]:
    candidates: list[tuple[int, int, int]] = []
    for sample_y in range(max(0, y - radius), min(height - 1, y + radius) + 1):
        for sample_x in range(max(0, x - radius), min(width - 1, x + radius) + 1):
            pixel = pixels[sample_x, sample_y]
            if not is_background(pixel):
                candidates.append(pixel)
    if not candidates:
        return pixels[x, y]
    channels = list(zip(*candidates))
    return tuple(sorted(channel)[len(channel) // 2] for channel in channels)


def line_points(
    start: tuple[float, float],
    end: tuple[float, float],
    spacing: float,
) -> list[tuple[float, float]]:
    distance = math.dist(start, end)
    steps = max(1, math.ceil(distance / spacing))
    return [
        (
            start[0] + (end[0] - start[0]) * step / steps,
            start[1] + (end[1] - start[1]) * step / steps,
        )
        for step in range(1, steps + 1)
    ]


def vector_angle(first: tuple[float, float], second: tuple[float, float]) -> float:
    dot = first[0] * second[0] + first[1] * second[1]
    determinant = first[0] * second[1] - first[1] * second[0]
    return math.atan2(determinant, dot)


def arc_points(
    start: tuple[float, float],
    values: list[float],
    spacing: float,
) -> list[tuple[float, float]]:
    radius_x, radius_y, rotation, large_arc, sweep, end_x, end_y = values
    end = (end_x, end_y)
    radius_x = abs(radius_x)
    radius_y = abs(radius_y)
    if radius_x == 0 or radius_y == 0 or start == end:
        return line_points(start, end, spacing)

    phi = math.radians(rotation % 360)
    cosine = math.cos(phi)
    sine = math.sin(phi)
    delta_x = (start[0] - end_x) / 2
    delta_y = (start[1] - end_y) / 2
    transformed_x = cosine * delta_x + sine * delta_y
    transformed_y = -sine * delta_x + cosine * delta_y

    scale = transformed_x**2 / radius_x**2 + transformed_y**2 / radius_y**2
    if scale > 1:
        factor = math.sqrt(scale)
        radius_x *= factor
        radius_y *= factor

    numerator = max(
        0.0,
        radius_x**2 * radius_y**2
        - radius_x**2 * transformed_y**2
        - radius_y**2 * transformed_x**2,
    )
    denominator = (
        radius_x**2 * transformed_y**2
        + radius_y**2 * transformed_x**2
    )
    coefficient = 0.0 if denominator == 0 else math.sqrt(numerator / denominator)
    if bool(round(large_arc)) == bool(round(sweep)):
        coefficient = -coefficient
    center_x_transformed = coefficient * radius_x * transformed_y / radius_y
    center_y_transformed = -coefficient * radius_y * transformed_x / radius_x
    center_x = cosine * center_x_transformed - sine * center_y_transformed + (start[0] + end_x) / 2
    center_y = sine * center_x_transformed + cosine * center_y_transformed + (start[1] + end_y) / 2

    start_vector = (
        (transformed_x - center_x_transformed) / radius_x,
        (transformed_y - center_y_transformed) / radius_y,
    )
    end_vector = (
        (-transformed_x - center_x_transformed) / radius_x,
        (-transformed_y - center_y_transformed) / radius_y,
    )
    start_angle = vector_angle((1.0, 0.0), start_vector)
    sweep_angle = vector_angle(start_vector, end_vector)
    if not bool(round(sweep)) and sweep_angle > 0:
        sweep_angle -= 2 * math.pi
    elif bool(round(sweep)) and sweep_angle < 0:
        sweep_angle += 2 * math.pi

    estimated_length = abs(sweep_angle) * max(radius_x, radius_y)
    steps = max(1, math.ceil(estimated_length / spacing))
    points = []
    for step in range(1, steps + 1):
        angle = start_angle + sweep_angle * step / steps
        points.append(
            (
                center_x + cosine * radius_x * math.cos(angle) - sine * radius_y * math.sin(angle),
                center_y + sine * radius_x * math.cos(angle) + cosine * radius_y * math.sin(angle),
            )
        )
    return points


def flattened_path(path_data: str, spacing: float) -> list[tuple[float, float]]:
    tokens = TOKEN.findall(path_data)
    points: list[tuple[float, float]] = []
    index = 0
    command = ""
    current = (0.0, 0.0)
    subpath_start = current
    while index < len(tokens):
        if tokens[index].isalpha():
            command = tokens[index]
            index += 1
        if command == "Z":
            points.extend(line_points(current, subpath_start, spacing))
            current = subpath_start
            command = ""
            continue
        count = PARAMETERS[command]
        values = [float(value) for value in tokens[index:index + count]]
        index += count
        if command == "M":
            current = (values[0], values[1])
            subpath_start = current
            points.append(current)
        elif command == "L":
            end = (values[0], values[1])
            points.extend(line_points(current, end, spacing))
            current = end
        elif command == "Q":
            control = (values[0], values[1])
            end = (values[2], values[3])
            length = math.dist(current, control) + math.dist(control, end)
            steps = max(1, math.ceil(length / spacing))
            for step in range(1, steps + 1):
                amount = step / steps
                inverse = 1 - amount
                points.append(
                    (
                        inverse**2 * current[0] + 2 * inverse * amount * control[0] + amount**2 * end[0],
                        inverse**2 * current[1] + 2 * inverse * amount * control[1] + amount**2 * end[1],
                    )
                )
            current = end
        elif command == "C":
            first = (values[0], values[1])
            second = (values[2], values[3])
            end = (values[4], values[5])
            length = math.dist(current, first) + math.dist(first, second) + math.dist(second, end)
            steps = max(1, math.ceil(length / spacing))
            for step in range(1, steps + 1):
                amount = step / steps
                inverse = 1 - amount
                points.append(
                    (
                        inverse**3 * current[0] + 3 * inverse**2 * amount * first[0] + 3 * inverse * amount**2 * second[0] + amount**3 * end[0],
                        inverse**3 * current[1] + 3 * inverse**2 * amount * first[1] + 3 * inverse * amount**2 * second[1] + amount**3 * end[1],
                    )
                )
            current = end
        elif command == "A":
            arc = arc_points(current, values, spacing)
            points.extend(arc)
            current = (values[5], values[6])
    return points


def path_points(path_data: str) -> list[tuple[float, float]]:
    tokens = TOKEN.findall(path_data)
    points: list[tuple[float, float]] = []
    index = 0
    command = ""
    while index < len(tokens):
        if tokens[index].isalpha():
            command = tokens[index]
            index += 1
        if command == "Z" or index >= len(tokens):
            continue
        count = PARAMETERS[command]
        values = [float(value) for value in tokens[index:index + count]]
        index += count
        if command in {"M", "L"}:
            points.append((values[0], values[1]))
        elif command == "A":
            points.append((values[5], values[6]))
        elif command == "Q":
            points.extend(((values[0], values[1]), (values[2], values[3])))
        elif command == "C":
            points.extend(
                ((values[0], values[1]), (values[2], values[3]), (values[4], values[5]))
            )
    return points


def main(png_name: str, svg_name: str, output_name: str) -> None:
    png_path = Path(png_name)
    svg_path = Path(svg_name)
    output_path = Path(output_name)

    image = Image.open(png_path).convert("RGB")
    tree = ET.parse(svg_path)
    root = tree.getroot()
    width = int(root.get("width", "0"))
    height = int(root.get("height", "0"))
    if image.size != (width, height):
        raise RuntimeError(
            f"PNG {image.size} and SVG {(width, height)} must use identical coordinates"
        )

    half_width = (width + 1) // 2
    half_height = (height + 1) // 2
    half_image = image.resize((half_width, half_height), Image.Resampling.LANCZOS)
    scale_x = width / half_width
    scale_y = height / half_height

    namespace = root.tag.partition("}")[0].removeprefix("{")
    if namespace:
        ET.register_namespace("", namespace)
        qualify = lambda name: f"{{{namespace}}}{name}"
    else:
        qualify = lambda name: name

    defs = next((child for child in root if local_name(child.tag) == "defs"), None)
    artwork = next((child for child in root if local_name(child.tag) == "g"), None)
    if defs is None or artwork is None:
        raise RuntimeError("Expected the transparent SVG to contain defs and an artwork group")

    icon_paths: list[ET.Element] = []
    icon_points: list[tuple[float, float]] = []
    for child in list(artwork):
        if local_name(child.tag) != "path":
            continue
        points = path_points(child.get("d", ""))
        if points and max(point[0] for point in points) < ICON_RIGHT_EDGE:
            icon_paths.append(child)
            icon_points.extend(points)

    if not icon_paths:
        raise RuntimeError("No icon paths were identified")

    min_x = max(0.0, min(point[0] for point in icon_points) - 2.0)
    max_x = min(float(width), max(point[0] for point in icon_points) + 2.0)
    min_y = max(0.0, min(point[1] for point in icon_points) - 2.0)
    max_y = min(float(height), max(point[1] for point in icon_points) + 2.0)

    clip = ET.SubElement(defs, qualify("clipPath"), {"id": "sampled-icon-clip"})
    for path in icon_paths:
        clipped = copy.deepcopy(path)
        clipped.attrib.pop("fill", None)
        clipped.attrib.pop("stroke", None)
        clip.append(clipped)
        artwork.remove(path)

    smoothing = ET.SubElement(
        defs,
        qualify("filter"),
        {
            "id": "sample-grid-smoothing",
            "x": "-2%",
            "y": "-2%",
            "width": "104%",
            "height": "104%",
            "color-interpolation-filters": "sRGB",
        },
    )
    ET.SubElement(
        smoothing,
        qualify("feGaussianBlur"),
        {"stdDeviation": "1.15"},
    )
    edge_smoothing = ET.SubElement(
        defs,
        qualify("filter"),
        {
            "id": "edge-sample-smoothing",
            "x": "-2%",
            "y": "-2%",
            "width": "104%",
            "height": "104%",
            "color-interpolation-filters": "sRGB",
        },
    )
    ET.SubElement(
        edge_smoothing,
        qualify("feGaussianBlur"),
        {"stdDeviation": "0.52"},
    )

    sampled_group = ET.Element(
        qualify("g"),
        {
            "id": "png-grid-sampled-icon",
            "clip-path": "url(#sampled-icon-clip)",
        },
    )
    filtered_grid = ET.SubElement(
        sampled_group,
        qualify("g"),
        {"filter": "url(#sample-grid-smoothing)"},
    )
    scaled_grid = ET.SubElement(
        filtered_grid,
        qualify("g"),
        {
            "transform": f"scale({scale_x:.9f} {scale_y:.9f})",
            "shape-rendering": "crispEdges",
        },
    )
    half_min_x = min_x / scale_x
    half_max_x = max_x / scale_x
    half_min_y = min_y / scale_y
    half_max_y = max_y / scale_y
    cell_width = (half_max_x - half_min_x) / GRID_COLUMNS
    cell_height = (half_max_y - half_min_y) / GRID_ROWS
    pixels = half_image.load()
    for row in range(GRID_ROWS):
        y = half_min_y + row * cell_height
        sample_y = min(half_height - 1, max(0, round(y + cell_height / 2)))
        for column in range(GRID_COLUMNS):
            x = half_min_x + column * cell_width
            sample_x = min(half_width - 1, max(0, round(x + cell_width / 2)))
            red, green, blue = nearest_foreground(
                pixels,
                sample_x,
                sample_y,
                half_width,
                half_height,
            )
            ET.SubElement(
                scaled_grid,
                qualify("rect"),
                {
                    "x": f"{x:.3f}",
                    "y": f"{y:.3f}",
                    "width": f"{cell_width + 0.04:.3f}",
                    "height": f"{cell_height + 0.04:.3f}",
                    "fill": f"#{red:02x}{green:02x}{blue:02x}",
                },
            )

    edge_group = ET.SubElement(
        sampled_group,
        qualify("g"),
        {
            "id": "sampled-vector-edges",
            "filter": "url(#edge-sample-smoothing)",
        },
    )
    edge_samples = 0
    for path in icon_paths:
        for point_x, point_y in flattened_path(path.get("d", ""), EDGE_SAMPLE_SPACING):
            sample_x = min(half_width - 1, max(0, round(point_x / scale_x)))
            sample_y = min(half_height - 1, max(0, round(point_y / scale_y)))
            red, green, blue = median_foreground(
                pixels,
                sample_x,
                sample_y,
                half_width,
                half_height,
            )
            ET.SubElement(
                edge_group,
                qualify("circle"),
                {
                    "cx": f"{point_x:.3f}",
                    "cy": f"{point_y:.3f}",
                    "r": f"{EDGE_SAMPLE_RADIUS:.3f}",
                    "fill": f"#{red:02x}{green:02x}{blue:02x}",
                },
            )
            edge_samples += 1

    artwork.insert(0, sampled_group)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)
    print(f"Created {output_path}")
    print(f"sample_count={GRID_COLUMNS * GRID_ROWS}")
    print(f"sampling_resolution={half_width}x{half_height}")
    print(f"output_scale={scale_x:.9f},{scale_y:.9f}")
    print(f"icon_paths={len(icon_paths)}")
    print(f"edge_samples={edge_samples}")
    print(f"sample_bounds={min_x:.2f},{min_y:.2f} to {max_x:.2f},{max_y:.2f}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("usage: build-sampled-logo.py PNG TRANSPARENT_SVG OUTPUT_SVG")
    main(sys.argv[1], sys.argv[2], sys.argv[3])
