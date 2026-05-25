import { addVec3, dotVec3, vec3, type Vec3 } from "./vec3";

export interface Mat3 {
  readonly m00: number;
  readonly m01: number;
  readonly m02: number;
  readonly m10: number;
  readonly m11: number;
  readonly m12: number;
  readonly m20: number;
  readonly m21: number;
  readonly m22: number;
}

export interface RigidTransform3 {
  readonly rotation: Mat3;
  readonly translation: Vec3;
}

export const identityMat3: Mat3 = {
  m00: 1,
  m01: 0,
  m02: 0,
  m10: 0,
  m11: 1,
  m12: 0,
  m20: 0,
  m21: 0,
  m22: 1,
};

export const identityRigidTransform3: RigidTransform3 = {
  rotation: identityMat3,
  translation: { x: 0, y: 0, z: 0 },
};

export function rigidTransform3(rotation: Mat3, translation: Vec3): RigidTransform3 {
  return { rotation, translation };
}

export function transformPoint3(transform: RigidTransform3, point: Vec3): Vec3 {
  return addVec3(transformDirection3(transform, point), transform.translation);
}

export function transformDirection3(transform: RigidTransform3, direction: Vec3): Vec3 {
  return multiplyMat3Vec3(transform.rotation, direction);
}

export function applyRigidTransform3(transform: RigidTransform3, point: Vec3): Vec3 {
  return transformPoint3(transform, point);
}

/**
 * composeRigidTransform3(a, b) means apply b first, then a.
 */
export function composeRigidTransform3(a: RigidTransform3, b: RigidTransform3): RigidTransform3 {
  return {
    rotation: multiplyMat3(a.rotation, b.rotation),
    translation: addVec3(multiplyMat3Vec3(a.rotation, b.translation), a.translation),
  };
}

export function invertRigidTransform3(transform: RigidTransform3): RigidTransform3 {
  const rotation = transposeMat3(transform.rotation);

  return {
    rotation,
    translation: multiplyMat3Vec3(
      rotation,
      vec3(-transform.translation.x, -transform.translation.y, -transform.translation.z),
    ),
  };
}

export function yawRigidTransform3(radians: number, translation: Vec3 = vec3(0, 0, 0)): RigidTransform3 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    rotation: {
      m00: cos,
      m01: 0,
      m02: sin,
      m10: 0,
      m11: 1,
      m12: 0,
      m20: -sin,
      m21: 0,
      m22: cos,
    },
    translation,
  };
}

function multiplyMat3Vec3(matrix: Mat3, vector: Vec3): Vec3 {
  return vec3(
    dotVec3(vec3(matrix.m00, matrix.m01, matrix.m02), vector),
    dotVec3(vec3(matrix.m10, matrix.m11, matrix.m12), vector),
    dotVec3(vec3(matrix.m20, matrix.m21, matrix.m22), vector),
  );
}

function multiplyMat3(a: Mat3, b: Mat3): Mat3 {
  return {
    m00: a.m00 * b.m00 + a.m01 * b.m10 + a.m02 * b.m20,
    m01: a.m00 * b.m01 + a.m01 * b.m11 + a.m02 * b.m21,
    m02: a.m00 * b.m02 + a.m01 * b.m12 + a.m02 * b.m22,
    m10: a.m10 * b.m00 + a.m11 * b.m10 + a.m12 * b.m20,
    m11: a.m10 * b.m01 + a.m11 * b.m11 + a.m12 * b.m21,
    m12: a.m10 * b.m02 + a.m11 * b.m12 + a.m12 * b.m22,
    m20: a.m20 * b.m00 + a.m21 * b.m10 + a.m22 * b.m20,
    m21: a.m20 * b.m01 + a.m21 * b.m11 + a.m22 * b.m21,
    m22: a.m20 * b.m02 + a.m21 * b.m12 + a.m22 * b.m22,
  };
}

function transposeMat3(matrix: Mat3): Mat3 {
  return {
    m00: matrix.m00,
    m01: matrix.m10,
    m02: matrix.m20,
    m10: matrix.m01,
    m11: matrix.m11,
    m12: matrix.m21,
    m20: matrix.m02,
    m21: matrix.m12,
    m22: matrix.m22,
  };
}
