# Socket Frame Configurator 3D - Documentation

## 1. Project Overview
**Socket Frame Configurator 3D** is a web-based application for designing and customizing 3D printable socket frames. It leverages parametric design to allow users to modify shape, dimensions, and aesthetic details in real-time.

### **Tech Stack**
-   **Frontend Framework**: React 19 (Vite)
-   **Language**: TypeScript
-   **3D Engine**: Three.js (@react-three/fiber, @react-three/drei)
-   **Styling**: Tailwind CSS
-   **Build Tool**: Vite

---

## 2. Architecture
The application follows a unidirectional data flow pattern.
1.  **State Source**: `App.tsx` holds the single source of truth for the `FrameConfig` state.
2.  **Visualization**: `SocketFrame` component receives the config and updates the 3D geometry reactively.
3.  **Interaction**: `Controls` component modifies the config via user input.
4.  **Computation**: Geometry generation logic is isolated in `utils/geometry.ts`.

### **Directory Structure**
```
/
├── components/       # React components (UI & 3D)
│   ├── Controls.tsx  # Sidebar UI for parameter tuning
│   └── SocketFrame.tsx # 3D Mesh generation wrapper
├── utils/            # Pure logic and helpers
│   ├── geometry.ts   # Core procedural geometry algorithms
│   └── exportUtils.ts # STL export functionality
├── App.tsx           # Main application entry, Scene setup
├── types.ts          # TypeScript interfaces (FrameConfig)
└── main.tsx          # DOM entry point
```

---

## 3. Component Reference

### **App.tsx**
-   **Role**: Root component, Scene Coordinator.
-   **Key Responsibilities**:
    -   Initializes the `FrameConfig` state with `DEFAULT_CONFIG`.
    -   Sets up the `Canvas` (Three.js scene), lights, environment, and camera controls.
    -   Manages the `isExporting` state for UI feedback during STL generation.
    -   Handles the high-poly mesh generation for export (separate from the preview mesh).

### **components/SocketFrame.tsx**
-   **Role**: 3D Representation of the frame.
-   **Key Responsibilities**:
    -   Uses `useMemo` to regenerate geometry *only* when relevant config props change.
    -   Applies material properties (color, roughness, metalness).
    -   Manages decorative elements (Balls, Cones) as separate meshes or groups.
    -   Applies scale for shrinkage compensation in the visual preview.

### **components/Controls.tsx**
-   **Role**: User Interface for configuration.
-   **Key Responsibilities**:
    -   Renders sliders and toggles for `FrameConfig` properties.
    -   Updates the parent state via `setConfig`.
    -   Displays calculated values (e.g., compensated diameter).
    -   Triggers the export function.

---

## 4. Core Logic (`utils/geometry.ts`)

### **`generateFrameGeometry(config, qualityMultiplier)`**
This function is the parametric engine of the application. It returns a `THREE.BufferGeometry`.

**Algorithm Steps**:
1.  **Compensation Calculation**: Determines the scaling factor based on `shrinkagePercent`.
    -   `comp = 1 / (1 - shrinkage / 100)`
2.  **Profile Definition**:
    -   Calculates the **Outer Profile** (the shape of the frame's top surface).
    -   Allows for a "Step" and "Relief" design (flat edge -> curve -> flat top).
3.  **Petal Modulation**:
    -   Modulates the `currentOuterRadius` based on the angle `theta`.
    -   Uses a combination of `cos(petals * theta)` and power functions to control `petalRoundness` and `petalIndentation`.
4.  **Hollow Mode (Shell)**:
    -   If `isHollow` is true, it computes an **Inner Profile** by offsetting the outer profile points inwards by `wallThickness`.
    -   Stitches the outer and inner profiles together to form a solid shell.
5.  **Vertex Generation**:
    -   Iterates through angular segments (around the circle) and radial segments (profile height/width).
    -   Converts polar coordinates (radius, angle, height) to Cartesian (x, y, z).
    -   Generates UV coordinates for texture mapping.
6.  **Index Generation**:
    -   Connects vertices to form triangles (quads split into two triangles).

### **`generateSolidHalfCone(radius, height, segments)`**
A utility to generate custom decorative spike geometry.
-   Creates a cone that is "cut" in half vertically to sit flat on the frame surface.

---

## 5. Configuration (`FrameConfig`)
Defined in `types.ts`, this interface controls every aspect of the frame.

| Property | Description |
| :--- | :--- |
| `petals` | Number of lobes/petals (3-24). |
| `outerDiameter` | Total diameter of the frame (before compensation). |
| `innerHoleDiameter` | Diameter of the central cutout (critical dimension). |
| `stepDiameter` | Diameter where the relief curve begins. |
| `seatingRingDepth` | Vertical position of the inner ledge (for socket fitting). |
| `petalIndentation` | Depth of the curve between petals. |
| `petalRoundness` | Shape of the petal tip (sharp vs. round). |
| `shrinkagePercent` | Material shrinkage compensation factor (0-5%). |
| `isHollow` | Enables shell mode for material saving. |

---

## 6. Key Features

### **Shrinkage Compensation**
-   **Problem**: 3D printed parts (especially ABS/ASA) shrink as they cool.
-   **Solution**: The application scales the geometry *up* by a calculated factor so the final cooled part has correct dimensions.
-   **Formula**: $D_{print} = D_{target} \times \frac{1}{1 - \text{shrinkage}}$

### **STL Export**
-   **Process**:
    1.  User clicks "Eksportuj STL".
    2.  Application temporarily generates a **High-Poly** version of the geometry (3x resolution) to ensure smooth curves.
    3.  Decorative elements (Balls/Cones) are added to a temporary `THREE.Group`.
    4.  `STLExporter` parses the group and generates a binary STL file.
    5.  File is downloaded automatically.
