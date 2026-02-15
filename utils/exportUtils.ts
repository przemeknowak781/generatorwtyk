import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';

export const downloadSTL = (object: THREE.Object3D, filename: string) => {
  const exporter = new STLExporter();
  const options = { binary: true };

  // The exporter can take a single mesh or a whole group/scene
  const result = exporter.parse(object, options);

  const blob = new Blob([result], { type: 'application/octet-stream' });
  const link = document.createElement('a');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  document.body.removeChild(link);
};

/**
 * Downloads multiple STL files sequentially (one per mold quadrant).
 */
export const downloadMultipleSTL = (
  groups: THREE.Object3D[],
  filenames: string[],
) => {
  groups.forEach((group, i) => {
    setTimeout(() => {
      downloadSTL(group, filenames[i]);
    }, i * 400); // stagger downloads to avoid browser blocking
  });
};
