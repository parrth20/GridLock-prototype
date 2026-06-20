#!/usr/bin/env python3
"""Generate a compact, original low-poly GLB pack for ClearLane Bengaluru.

The generator intentionally uses only Python's standard library so the assets can
be rebuilt on any machine without Blender. One world unit equals roughly one metre.
"""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "models"


COLORS = {
    "asphalt": ((0.025, 0.045, 0.065, 1), 0.05, 0.92, None),
    "road_edge": ((0.18, 0.22, 0.25, 1), 0.05, 0.82, None),
    "concrete": ((0.32, 0.38, 0.42, 1), 0.02, 0.9, None),
    "white": ((0.92, 0.95, 0.96, 1), 0.02, 0.62, None),
    "yellow": ((1.0, 0.66, 0.08, 1), 0.05, 0.55, (0.3, 0.12, 0.0)),
    "cyan": ((0.04, 0.75, 0.82, 1), 0.18, 0.35, (0.0, 0.28, 0.34)),
    "red": ((0.95, 0.08, 0.12, 1), 0.12, 0.38, (0.22, 0.0, 0.0)),
    "amber": ((1.0, 0.34, 0.04, 1), 0.05, 0.45, (0.35, 0.055, 0.0)),
    "green": ((0.05, 0.72, 0.34, 1), 0.05, 0.48, (0.0, 0.18, 0.05)),
    "blue": ((0.04, 0.24, 0.58, 1), 0.2, 0.34, None),
    "navy": ((0.025, 0.075, 0.14, 1), 0.18, 0.45, None),
    "black": ((0.012, 0.018, 0.025, 1), 0.05, 0.8, None),
    "glass": ((0.035, 0.16, 0.25, 1), 0.38, 0.16, (0.0, 0.025, 0.04)),
    "silver": ((0.48, 0.54, 0.58, 1), 0.72, 0.25, None),
    "khaki": ((0.55, 0.42, 0.24, 1), 0.02, 0.9, None),
    "skin": ((0.48, 0.25, 0.13, 1), 0.0, 0.92, None),
    "foliage": ((0.035, 0.34, 0.16, 1), 0.0, 0.88, None),
    "trunk": ((0.25, 0.12, 0.045, 1), 0.0, 0.95, None),
    "building_a": ((0.055, 0.14, 0.2, 1), 0.18, 0.68, None),
    "building_b": ((0.075, 0.2, 0.25, 1), 0.2, 0.62, None),
    "building_c": ((0.16, 0.13, 0.2, 1), 0.16, 0.7, None),
}


def rotation_matrix(rx: float, ry: float, rz: float):
    cx, sx = math.cos(rx), math.sin(rx)
    cy, sy = math.cos(ry), math.sin(ry)
    cz, sz = math.cos(rz), math.sin(rz)
    return (
        (cy * cz, sx * sy * cz - cx * sz, cx * sy * cz + sx * sz),
        (cy * sz, sx * sy * sz + cx * cz, cx * sy * sz - sx * cz),
        (-sy, sx * cy, cx * cy),
    )


def rotate(v, matrix):
    return tuple(sum(matrix[row][col] * v[col] for col in range(3)) for row in range(3))


def normalize(v):
    length = math.sqrt(sum(value * value for value in v)) or 1.0
    return tuple(value / length for value in v)


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


class GLBBuilder:
    def __init__(self, name: str):
        self.name = name
        self.binary = bytearray()
        self.buffer_views = []
        self.accessors = []
        self.meshes = []
        self.nodes = []
        self.materials = []
        self.material_index = {}
        for material_name, values in COLORS.items():
            self.add_material(material_name, *values)

    def add_material(self, name, color, metallic, roughness, emissive):
        material = {
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": color,
                "metallicFactor": metallic,
                "roughnessFactor": roughness,
            },
        }
        if emissive:
            material["emissiveFactor"] = emissive
        self.material_index[name] = len(self.materials)
        self.materials.append(material)

    def _buffer_view(self, payload: bytes, target: int):
        while len(self.binary) % 4:
            self.binary.append(0)
        offset = len(self.binary)
        self.binary.extend(payload)
        index = len(self.buffer_views)
        self.buffer_views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(payload), "target": target})
        return index

    def _accessor(self, view, component_type, count, kind, minimum=None, maximum=None):
        accessor = {"bufferView": view, "componentType": component_type, "count": count, "type": kind}
        if minimum is not None:
            accessor["min"] = minimum
            accessor["max"] = maximum
        index = len(self.accessors)
        self.accessors.append(accessor)
        return index

    def add_geometry(self, name, vertices, normals, indices, material):
        flat_vertices = [value for vertex in vertices for value in vertex]
        flat_normals = [value for normal in normals for value in normal]
        vertex_view = self._buffer_view(struct.pack(f"<{len(flat_vertices)}f", *flat_vertices), 34962)
        normal_view = self._buffer_view(struct.pack(f"<{len(flat_normals)}f", *flat_normals), 34962)
        index_view = self._buffer_view(struct.pack(f"<{len(indices)}H", *indices), 34963)
        mins = [min(vertex[i] for vertex in vertices) for i in range(3)]
        maxs = [max(vertex[i] for vertex in vertices) for i in range(3)]
        position_accessor = self._accessor(vertex_view, 5126, len(vertices), "VEC3", mins, maxs)
        normal_accessor = self._accessor(normal_view, 5126, len(normals), "VEC3")
        index_accessor = self._accessor(index_view, 5123, len(indices), "SCALAR")
        mesh_index = len(self.meshes)
        self.meshes.append({
            "name": name,
            "primitives": [{
                "attributes": {"POSITION": position_accessor, "NORMAL": normal_accessor},
                "indices": index_accessor,
                "material": self.material_index[material],
            }],
        })
        self.nodes.append({"name": name, "mesh": mesh_index})

    def add_box(self, name, center, size, material, rotation=(0.0, 0.0, 0.0)):
        hx, hy, hz = (value / 2 for value in size)
        faces = [
            ((1, 0, 0), [(hx, -hy, -hz), (hx, hy, -hz), (hx, hy, hz), (hx, -hy, hz)]),
            ((-1, 0, 0), [(-hx, -hy, hz), (-hx, hy, hz), (-hx, hy, -hz), (-hx, -hy, -hz)]),
            ((0, 1, 0), [(-hx, hy, -hz), (-hx, hy, hz), (hx, hy, hz), (hx, hy, -hz)]),
            ((0, -1, 0), [(-hx, -hy, hz), (-hx, -hy, -hz), (hx, -hy, -hz), (hx, -hy, hz)]),
            ((0, 0, 1), [(hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz), (-hx, -hy, hz)]),
            ((0, 0, -1), [(-hx, -hy, -hz), (-hx, hy, -hz), (hx, hy, -hz), (hx, -hy, -hz)]),
        ]
        matrix = rotation_matrix(*rotation)
        vertices, normals, indices = [], [], []
        for normal, corners in faces:
            start = len(vertices)
            for corner in corners:
                value = rotate(corner, matrix)
                vertices.append(tuple(value[i] + center[i] for i in range(3)))
                normals.append(rotate(normal, matrix))
            indices.extend((start, start + 1, start + 2, start, start + 2, start + 3))
        self.add_geometry(name, vertices, normals, indices, material)

    def add_cylinder(self, name, center, radius, height, material, segments=12, rotation=(0.0, 0.0, 0.0)):
        vertices, normals, indices = [], [], []
        matrix = rotation_matrix(*rotation)
        for i in range(segments):
            angle = i * math.tau / segments
            direction = (math.cos(angle), 0.0, math.sin(angle))
            for y in (-height / 2, height / 2):
                point = rotate((radius * direction[0], y, radius * direction[2]), matrix)
                vertices.append(tuple(point[j] + center[j] for j in range(3)))
                normals.append(rotate(direction, matrix))
        for i in range(segments):
            a, b = i * 2, ((i + 1) % segments) * 2
            indices.extend((a, a + 1, b + 1, a, b + 1, b))
        for cap_y, normal in ((-height / 2, (0, -1, 0)), (height / 2, (0, 1, 0))):
            center_index = len(vertices)
            center_point = rotate((0, cap_y, 0), matrix)
            vertices.append(tuple(center_point[j] + center[j] for j in range(3)))
            normals.append(rotate(normal, matrix))
            rim_start = len(vertices)
            for i in range(segments):
                angle = i * math.tau / segments
                point = rotate((radius * math.cos(angle), cap_y, radius * math.sin(angle)), matrix)
                vertices.append(tuple(point[j] + center[j] for j in range(3)))
                normals.append(rotate(normal, matrix))
            for i in range(segments):
                nxt = (i + 1) % segments
                if cap_y > 0:
                    indices.extend((center_index, rim_start + i, rim_start + nxt))
                else:
                    indices.extend((center_index, rim_start + nxt, rim_start + i))
        self.add_geometry(name, vertices, normals, indices, material)

    def add_sphere(self, name, center, radius, material, rings=8, segments=12):
        vertices, normals, indices = [], [], []
        for ring in range(rings + 1):
            phi = math.pi * ring / rings
            for segment in range(segments):
                theta = math.tau * segment / segments
                normal = (math.sin(phi) * math.cos(theta), math.cos(phi), math.sin(phi) * math.sin(theta))
                vertices.append(tuple(center[i] + radius * normal[i] for i in range(3)))
                normals.append(normal)
        for ring in range(rings):
            for segment in range(segments):
                nxt = (segment + 1) % segments
                a = ring * segments + segment
                b = ring * segments + nxt
                c = (ring + 1) * segments + segment
                d = (ring + 1) * segments + nxt
                indices.extend((a, c, d, a, d, b))
        self.add_geometry(name, vertices, normals, indices, material)

    def add_torus(self, name, center, major_radius, minor_radius, material, rotation=(0.0, 0.0, 0.0), segments=20, tube_segments=6):
        vertices, normals, indices = [], [], []
        matrix = rotation_matrix(*rotation)
        for major in range(segments):
            u = math.tau * major / segments
            for tube in range(tube_segments):
                v = math.tau * tube / tube_segments
                normal = (math.cos(u) * math.cos(v), math.sin(v), math.sin(u) * math.cos(v))
                point = ((major_radius + minor_radius * math.cos(v)) * math.cos(u), minor_radius * math.sin(v), (major_radius + minor_radius * math.cos(v)) * math.sin(u))
                point = rotate(point, matrix)
                vertices.append(tuple(point[i] + center[i] for i in range(3)))
                normals.append(rotate(normal, matrix))
        for major in range(segments):
            for tube in range(tube_segments):
                a = major * tube_segments + tube
                b = ((major + 1) % segments) * tube_segments + tube
                c = ((major + 1) % segments) * tube_segments + (tube + 1) % tube_segments
                d = major * tube_segments + (tube + 1) % tube_segments
                indices.extend((a, b, c, a, c, d))
        self.add_geometry(name, vertices, normals, indices, material)

    def add_cylinder_between(self, name, start, end, radius, material, segments=10):
        axis = tuple(end[i] - start[i] for i in range(3))
        direction = normalize(axis)
        tangent = normalize(cross(direction, (0, 1, 0) if abs(direction[1]) < 0.9 else (1, 0, 0)))
        bitangent = cross(direction, tangent)
        vertices, normals, indices = [], [], []
        for point in (start, end):
            for segment in range(segments):
                angle = math.tau * segment / segments
                normal = tuple(tangent[i] * math.cos(angle) + bitangent[i] * math.sin(angle) for i in range(3))
                vertices.append(tuple(point[i] + radius * normal[i] for i in range(3)))
                normals.append(normal)
        for segment in range(segments):
            nxt = (segment + 1) % segments
            indices.extend((segment, segments + segment, segments + nxt, segment, segments + nxt, nxt))
        self.add_geometry(name, vertices, normals, indices, material)

    def save(self, filename: str, description: str):
        while len(self.binary) % 4:
            self.binary.append(0)
        document = {
            "asset": {
                "version": "2.0",
                "generator": "ClearLane procedural asset generator",
                "copyright": "2026 ClearLane Bengaluru — original hackathon asset",
                "extras": {"units": "metres", "description": description},
            },
            "scene": 0,
            "scenes": [{"name": self.name, "nodes": list(range(len(self.nodes)))}],
            "nodes": self.nodes,
            "meshes": self.meshes,
            "materials": self.materials,
            "accessors": self.accessors,
            "bufferViews": self.buffer_views,
            "buffers": [{"byteLength": len(self.binary)}],
        }
        json_chunk = json.dumps(document, separators=(",", ":")).encode("utf-8")
        while len(json_chunk) % 4:
            json_chunk += b" "
        total_length = 12 + 8 + len(json_chunk) + 8 + len(self.binary)
        payload = struct.pack("<4sII", b"glTF", 2, total_length)
        payload += struct.pack("<I4s", len(json_chunk), b"JSON") + json_chunk
        payload += struct.pack("<I4s", len(self.binary), b"BIN\x00") + bytes(self.binary)
        OUTPUT.mkdir(parents=True, exist_ok=True)
        (OUTPUT / filename).write_bytes(payload)


def local_point(origin, yaw, offset):
    x, y, z = offset
    return (origin[0] + x * math.cos(yaw) + z * math.sin(yaw), origin[1] + y, origin[2] - x * math.sin(yaw) + z * math.cos(yaw))


def add_car(builder, name, origin=(0, 0, 0), yaw=0.0, color="cyan", scale=1.0, police=False):
    def point(offset):
        return local_point(origin, yaw, tuple(value * scale for value in offset))

    builder.add_box(f"{name}_body", point((0, 0.55, 0)), (1.82 * scale, 0.48 * scale, 3.75 * scale), color, (0, yaw, 0))
    builder.add_box(f"{name}_hood", point((0, 0.82, 1.15)), (1.72 * scale, 0.25 * scale, 1.22 * scale), color, (0, yaw, 0))
    builder.add_box(f"{name}_cabin", point((0, 1.04, -0.25)), (1.55 * scale, 0.64 * scale, 1.7 * scale), "glass", (0, yaw, 0))
    builder.add_box(f"{name}_roof", point((0, 1.38, -0.28)), (1.48 * scale, 0.12 * scale, 1.55 * scale), color, (0, yaw, 0))
    for side in (-1, 1):
        for z in (-1.18, 1.18):
            wheel_center = point((0.93 * side, 0.35, z))
            axis = (math.cos(yaw), 0.0, -math.sin(yaw))
            p1 = tuple(wheel_center[i] - axis[i] * 0.14 * scale for i in range(3))
            p2 = tuple(wheel_center[i] + axis[i] * 0.14 * scale for i in range(3))
            builder.add_cylinder_between(f"{name}_wheel_{side}_{z}", p1, p2, 0.34 * scale, "black", 12)
    for side in (-0.58, 0.58):
        builder.add_box(f"{name}_headlight_{side}", point((side, 0.62, 1.89)), (0.34 * scale, 0.2 * scale, 0.06 * scale), "white", (0, yaw, 0))
        builder.add_box(f"{name}_taillight_{side}", point((side, 0.63, -1.89)), (0.32 * scale, 0.18 * scale, 0.06 * scale), "red", (0, yaw, 0))
    if police:
        builder.add_box(f"{name}_police_stripe", point((0, 0.61, 0)), (1.86 * scale, 0.12 * scale, 2.9 * scale), "white", (0, yaw, 0))
        builder.add_box(f"{name}_lightbar", point((0, 1.52, -0.28)), (1.0 * scale, 0.12 * scale, 0.25 * scale), "red", (0, yaw, 0))


def add_signal(builder, name, origin=(0, 0, 0), yaw=0.0, scale=1.0):
    builder.add_cylinder(f"{name}_pole", local_point(origin, yaw, (0, 2.0 * scale, 0)), 0.09 * scale, 4.0 * scale, "silver", 10)
    builder.add_box(f"{name}_head", local_point(origin, yaw, (0, 3.65 * scale, 0)), (0.58 * scale, 1.32 * scale, 0.45 * scale), "black", (0, yaw, 0))
    for index, material in enumerate(("red", "amber", "green")):
        builder.add_sphere(f"{name}_{material}", local_point(origin, yaw, (0, (4.04 - index * 0.39) * scale, 0.23 * scale)), 0.14 * scale, material, 6, 10)
    builder.add_box(f"{name}_base", local_point(origin, yaw, (0, 0.14 * scale, 0)), (0.65 * scale, 0.28 * scale, 0.65 * scale), "concrete", (0, yaw, 0))


def add_tree(builder, name, origin, scale=1.0):
    builder.add_cylinder(f"{name}_trunk", (origin[0], origin[1] + 1.15 * scale, origin[2]), 0.18 * scale, 2.3 * scale, "trunk", 9)
    builder.add_sphere(f"{name}_crown_a", (origin[0], origin[1] + 2.9 * scale, origin[2]), 1.05 * scale, "foliage", 6, 10)
    builder.add_sphere(f"{name}_crown_b", (origin[0] + 0.6 * scale, origin[1] + 2.65 * scale, origin[2] + 0.12 * scale), 0.7 * scale, "foliage", 6, 10)


def build_parked_car():
    builder = GLBBuilder("Parked Car")
    add_car(builder, "parked_car", color="amber")
    builder.save("parked-car.glb", "Low-poly illegally parked passenger car with emissive lights.")


def build_traffic_signal():
    builder = GLBBuilder("Traffic Signal")
    add_signal(builder, "traffic_signal")
    builder.save("traffic-signal.glb", "Four-metre urban traffic signal with three emissive lamps.")


def build_police():
    builder = GLBBuilder("Traffic Police Officer")
    builder.add_box("torso", (0, 1.32, 0), (0.62, 0.72, 0.32), "white")
    builder.add_box("reflective_vest", (0, 1.34, 0.17), (0.5, 0.42, 0.035), "yellow")
    builder.add_sphere("head", (0, 1.93, 0), 0.24, "skin", 7, 12)
    builder.add_cylinder("cap", (0, 2.16, 0), 0.25, 0.12, "white", 12)
    builder.add_box("cap_peak", (0, 2.12, 0.2), (0.36, 0.055, 0.28), "navy")
    builder.add_cylinder_between("left_arm", (-0.28, 1.56, 0), (-0.47, 0.98, 0.06), 0.095, "white")
    builder.add_cylinder_between("right_arm", (0.28, 1.56, 0), (0.62, 1.76, 0.02), 0.095, "white")
    builder.add_sphere("left_hand", (-0.47, 0.94, 0.06), 0.105, "skin", 6, 10)
    builder.add_sphere("right_hand", (0.65, 1.78, 0.02), 0.105, "skin", 6, 10)
    builder.add_box("belt", (0, 0.99, 0), (0.65, 0.12, 0.35), "navy")
    builder.add_cylinder_between("left_leg", (-0.17, 0.98, 0), (-0.18, 0.18, 0), 0.12, "khaki")
    builder.add_cylinder_between("right_leg", (0.17, 0.98, 0), (0.2, 0.18, 0), 0.12, "khaki")
    builder.add_box("left_shoe", (-0.18, 0.09, 0.08), (0.28, 0.16, 0.5), "black")
    builder.add_box("right_shoe", (0.2, 0.09, 0.08), (0.28, 0.16, 0.5), "black")
    builder.save("traffic-police.glb", "Low-poly Bengaluru traffic police officer in white and khaki uniform.")


def build_bike():
    builder = GLBBuilder("Patrol Bike")
    for z in (-0.92, 0.92):
        builder.add_cylinder(f"wheel_{z}", (0, 0.48, z), 0.47, 0.18, "black", 16, (0, 0, math.pi / 2))
        builder.add_cylinder(f"hub_{z}", (0, 0.48, z), 0.16, 0.22, "silver", 12, (0, 0, math.pi / 2))
    builder.add_cylinder_between("frame_lower", (0, 0.55, -0.72), (0, 0.86, 0.42), 0.08, "red")
    builder.add_cylinder_between("frame_upper", (0, 0.87, -0.43), (0, 0.92, 0.55), 0.08, "red")
    builder.add_cylinder_between("front_fork", (0, 0.55, 0.92), (0, 1.22, 0.62), 0.055, "silver")
    builder.add_box("fuel_tank", (0, 1.02, 0.15), (0.58, 0.42, 0.72), "white")
    builder.add_box("police_panel", (0, 1.02, 0.5), (0.6, 0.2, 0.2), "blue")
    builder.add_box("seat", (0, 1.05, -0.47), (0.48, 0.16, 0.75), "black")
    builder.add_cylinder_between("handlebar", (-0.42, 1.35, 0.65), (0.42, 1.35, 0.65), 0.045, "silver")
    builder.add_sphere("headlamp", (0, 1.2, 0.82), 0.18, "white", 6, 12)
    builder.add_box("rear_box", (0, 1.22, -0.94), (0.72, 0.5, 0.5), "white")
    builder.add_box("rear_light", (0, 1.14, -1.21), (0.38, 0.16, 0.05), "red")
    builder.save("patrol-bike.glb", "Compact low-poly traffic police patrol motorcycle.")


def build_tow_truck():
    builder = GLBBuilder("Tow Truck")
    origin = (0, 0, 0)
    builder.add_box("chassis", (0, 0.62, 0), (2.25, 0.32, 5.8), "black")
    builder.add_box("cab", (0, 1.35, 1.78), (2.15, 1.65, 2.05), "amber")
    builder.add_box("windshield", (0, 1.63, 2.82), (1.65, 0.65, 0.05), "glass")
    builder.add_box("flatbed", (0, 1.0, -1.25), (2.2, 0.2, 3.6), "silver", (0.08, 0, 0))
    builder.add_cylinder_between("boom", (0, 1.45, -1.1), (0, 2.65, -2.3), 0.12, "yellow")
    builder.add_cylinder_between("hook_cable", (0, 2.65, -2.3), (0, 1.05, -2.82), 0.035, "black")
    builder.add_torus("hook", (0, 0.92, -2.82), 0.18, 0.05, "silver", (math.pi / 2, 0, 0), 12, 5)
    for side in (-1.12, 1.12):
        for z in (-1.75, 1.75):
            center = (side, 0.55, z)
            builder.add_cylinder_between(f"wheel_{side}_{z}", (center[0] - 0.12, center[1], center[2]), (center[0] + 0.12, center[1], center[2]), 0.46, "black", 14)
    builder.add_box("lightbar", (0, 2.25, 1.75), (1.15, 0.14, 0.25), "amber")
    builder.save("tow-truck.glb", "Low-poly enforcement tow truck with tilted bed, boom and hook.")


def add_road_markings(builder, span=30.0):
    for offset in range(-12, 13, 4):
        builder.add_box(f"lane_ns_{offset}", (0, 0.035, offset), (0.12, 0.035, 2.0), "white")
        builder.add_box(f"lane_ew_{offset}", (offset, 0.04, 0), (2.0, 0.035, 0.12), "white")
    for index in range(6):
        stripe = -2.5 + index
        builder.add_box(f"zebra_n_{index}", (stripe, 0.05, 5.1), (0.55, 0.04, 2.0), "white")
        builder.add_box(f"zebra_e_{index}", (5.1, 0.055, stripe), (2.0, 0.04, 0.55), "white")


def build_junction():
    builder = GLBBuilder("Road Junction")
    builder.add_box("ground", (0, -0.18, 0), (30, 0.3, 30), "road_edge")
    builder.add_box("road_north_south", (0, 0, 0), (8, 0.18, 30), "asphalt")
    builder.add_box("road_east_west", (0, 0.01, 0), (30, 0.18, 8), "asphalt")
    for x, z in ((-9.5, -9.5), (9.5, -9.5), (-9.5, 9.5), (9.5, 9.5)):
        builder.add_box(f"sidewalk_{x}_{z}", (x, 0.1, z), (11, 0.25, 11), "concrete")
    add_road_markings(builder)
    add_signal(builder, "signal_ne", (5.4, 0.2, 5.4), math.pi)
    add_signal(builder, "signal_sw", (-5.4, 0.2, -5.4), 0)
    builder.save("road-junction.glb", "Thirty-metre four-way road junction with markings, crossings and signals.")


def build_illegal_scene():
    builder = GLBBuilder("Illegal Parking Scene")
    builder.add_box("ground", (0, -0.18, 0), (18, 0.3, 28), "road_edge")
    builder.add_box("road", (0, 0, 0), (11.5, 0.18, 28), "asphalt")
    builder.add_box("left_walk", (-7.4, 0.12, 0), (3.2, 0.28, 28), "concrete")
    builder.add_box("right_walk", (7.4, 0.12, 0), (3.2, 0.28, 28), "concrete")
    for z in range(-12, 13, 4):
        builder.add_box(f"lane_{z}", (0, 0.1, z), (0.12, 0.035, 2.0), "white")
    add_car(builder, "illegal_car", (4.05, 0.12, 1.8), 0, "amber")
    builder.add_torus("risk_ring", (4.05, 0.18, 1.8), 2.05, 0.1, "red", segments=24)
    add_car(builder, "queue_1", (1.8, 0.12, -3.7), 0, "cyan", 0.9)
    add_car(builder, "queue_2", (1.8, 0.12, -8.1), 0, "blue", 0.9)
    add_car(builder, "passing_car", (-2.8, 0.12, 5.1), math.pi, "white", 0.9)
    add_signal(builder, "scene_signal", (-4.7, 0.2, 11.0), 0, 0.85)
    builder.save("illegal-parking-scene.glb", "Story scene showing an illegal parked car, congestion queue and hotspot ring.")


def build_city():
    builder = GLBBuilder("ClearLane Bengaluru Mini City")
    builder.add_box("city_base", (0, -0.35, 0), (40, 0.6, 40), "road_edge")
    builder.add_box("road_ns", (0, 0, 0), (8, 0.2, 40), "asphalt")
    builder.add_box("road_ew", (0, 0.01, 0), (40, 0.2, 8), "asphalt")
    for x, z in ((-12, -12), (12, -12), (-12, 12), (12, 12)):
        builder.add_box(f"block_{x}_{z}", (x, 0.15, z), (15, 0.35, 15), "concrete")
    add_road_markings(builder, 40)
    heights = [4.4, 6.8, 8.2, 5.6, 10.4, 7.3, 9.2, 5.1, 6.2, 11.0, 7.7, 4.8, 8.8, 6.5, 9.9, 5.8]
    block_centres = [(-12, -12), (12, -12), (-12, 12), (12, 12)]
    index = 0
    for block_x, block_z in block_centres:
        for dx in (-3.8, 3.8):
            for dz in (-3.8, 3.8):
                height = heights[index]
                material = ("building_a", "building_b", "building_c")[index % 3]
                builder.add_box(f"building_{index}", (block_x + dx, 0.35 + height / 2, block_z + dz), (5.2, height, 5.2), material)
                builder.add_box(f"roof_glow_{index}", (block_x + dx, 0.4 + height, block_z + dz), (3.2, 0.09, 3.2), "cyan")
                index += 1
    for tree_index, location in enumerate(((-5.2, -8), (5.2, -8), (-5.2, 9), (5.2, 9), (-16, 5.2), (16, -5.2))):
        add_tree(builder, f"tree_{tree_index}", (location[0], 0.35, location[1]), 0.7)
    add_car(builder, "illegal_car", (3.15, 0.16, 7.2), 0, "amber", 0.75)
    builder.add_torus("critical_hotspot", (3.15, 0.24, 7.2), 1.8, 0.09, "red", segments=22)
    add_car(builder, "car_north", (-1.8, 0.16, -8), 0, "cyan", 0.72)
    add_car(builder, "car_south", (1.8, 0.16, -4.2), math.pi, "white", 0.72)
    add_car(builder, "car_east", (-9.2, 0.16, 1.8), math.pi / 2, "blue", 0.72)
    add_signal(builder, "signal_city_ne", (5.3, 0.2, 5.3), math.pi, 0.78)
    add_signal(builder, "signal_city_sw", (-5.3, 0.2, -5.3), 0, 0.78)
    builder.save("bengaluru-city.glb", "Isometric Bengaluru-inspired smart-city junction for the ClearLane hero and dashboard.")


def validate_glb(path: Path):
    data = path.read_bytes()
    magic, version, total_length = struct.unpack("<4sII", data[:12])
    if magic != b"glTF" or version != 2 or total_length != len(data):
        raise ValueError(f"Invalid GLB header: {path.name}")
    json_length, json_type = struct.unpack("<I4s", data[12:20])
    if json_type != b"JSON":
        raise ValueError(f"Missing JSON chunk: {path.name}")
    json.loads(data[20:20 + json_length])


def main():
    builders = (
        build_city,
        build_illegal_scene,
        build_police,
        build_bike,
        build_tow_truck,
        build_traffic_signal,
        build_parked_car,
        build_junction,
    )
    for build in builders:
        build()
    for path in sorted(OUTPUT.glob("*.glb")):
        validate_glb(path)
        print(f"{path.name:28} {path.stat().st_size / 1024:7.1f} KB")


if __name__ == "__main__":
    main()
