import React from 'react';
import { Boxes } from 'lucide-react';
import { UpcomingToolPreview } from '../UpcomingToolPreview';

export default function VectorCalculator() {
  return (
    <UpcomingToolPreview
      title="Vector Calculator"
      subtitle="2D and 3D vector arithmetic, dot product, cross product, vector projection, angle between vectors, normalization, linear independence, and Gram-Schmidt orthogonalization."
      category="Linear Algebra & Vectors"
      icon={Boxes}
      color="#ea580c"
      plannedFeatures={[
        { name: 'Vector Arithmetic & Scaling', desc: 'Vector addition u + v, subtraction u - v, linear combinations c₁u + c₂v, and scalar multiplication.' },
        { name: 'Dot & Cross Products', desc: 'Compute Euclidean dot product u · v, angle θ = arccos(u·v / (|u||v|)), and 3D cross product u × v orthogonal vectors.' },
        { name: 'Orthogonal Projections', desc: 'Calculate proj_v(u) = (u·v / |v|²)v and orthogonal decomposition u = u_parallel + u_perp.' },
        { name: 'Magnitude & Unit Vectors', desc: 'Compute Euclidean norm ||v|| and normalize to unit vector u = v / ||v||.' },
        { name: 'Gram-Schmidt Process', desc: 'Transform arbitrary linearly independent sets into orthonormal bases for arbitrary dimensions.' },
      ]}
      exampleFormulas={[
        { label: 'Dot Product', tex: '\\mathbf{u} \\cdot \\mathbf{v} = u_1 v_1 + u_2 v_2 + u_3 v_3 = \\|\\mathbf{u}\\| \\|\\mathbf{v}\\| \\cos\\theta' },
        { label: 'Cross Product', tex: '\\mathbf{u} \\times \\mathbf{v} = \\begin{vmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\\\ u_1 & u_2 & u_3 \\\\ v_1 & v_2 & v_3 \\end{vmatrix}' },
        { label: 'Projection', tex: '\\mathrm{proj}_{\\mathbf{v}}(\\mathbf{u}) = \\frac{\\mathbf{u} \\cdot \\mathbf{v}}{\\|\\mathbf{v}\\|^2} \\mathbf{v}' },
      ]}
      relatedActiveTools={[
        { title: 'Matrix Calculator', path: '/matrix' },
        { title: 'System of Equations Solver', path: '/system-of-equations' },
        { title: 'Complex Numbers Calculator', path: '/complex' },
      ]}
    />
  );
}
