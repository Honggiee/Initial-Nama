// Get the canvas element and initialize WebGL with antialiasing disabled for sharper edges
const canvas = document.getElementById("gl-canvas");
const gl = WebGLUtils.initWebGL(canvas, { antialias: false });

// Controls for the application
const perspectiveButton = document.getElementById("perspective");
const orthogonalButton = document.getElementById("orthogonal");

// Letter-specific controls
const hRotationSpeedInput = document.getElementById("h-rotation-speed");
const oRotationSpeedInput = document.getElementById("o-rotation-speed");
const nRotationSpeedInput = document.getElementById("n-rotation-speed");
const hRotationAxisSelect = document.getElementById("h-rotation-axis");
const oRotationAxisSelect = document.getElementById("o-rotation-axis");
const nRotationAxisSelect = document.getElementById("n-rotation-axis");

// Set initial state variables
let isPerspective = true;
let hRotationSpeed = parseFloat(hRotationSpeedInput.value) / 50;
let oRotationSpeed = parseFloat(oRotationSpeedInput.value) / 50;
let nRotationSpeed = parseFloat(nRotationSpeedInput.value) / 50;
let hRotationAxis = getAxisVector(hRotationAxisSelect.value);
let oRotationAxis = getAxisVector(oRotationAxisSelect.value);
let nRotationAxis = getAxisVector(nRotationAxisSelect.value);
let modelData = null;

// Store time-independent rotation angles
let hAngle = 0;
let oAngle = 0;
let nAngle = 0;

// Track last timestamp for delta time calculation
let lastTimestamp = 0;

// Helper function to convert axis name to vector
function getAxisVector(axisName) {
  switch (axisName) {
    case "x":
      return [1, 0, 0];
    case "y":
      return [0, 1, 0];
    case "z":
      return [0, 0, 1];
    default:
      return [0, 1, 0];
  }
}

// Shader sources
const vertexShaderSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute float aObjectIndex;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uModelMatrix;
uniform bool uIsPerspective;

varying vec3 vNormal;
varying float vObjectIndex;
varying vec3 vOriginalNormal;

void main() {
    // Transform the vertex position with highest precision
    vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
    vec4 viewPosition = uModelViewMatrix * worldPosition;
    
    // Output the position in clip space
    gl_Position = uProjectionMatrix * viewPosition;
    
    // Pass the original untransformed normal to the fragment shader for static face identification
    vOriginalNormal = aNormal;
    
    // Pass transformed normal and object index to the fragment shader
    vNormal = normalize((uModelMatrix * vec4(aNormal, 0.0)).xyz);
    vObjectIndex = aObjectIndex;
}
`;

const fragmentShaderSource = `
precision highp float; // Use high precision for sharper results

varying vec3 vNormal;
varying float vObjectIndex;
varying vec3 vOriginalNormal;

void main() {
    // Use original normals to determine face - these won't change during rotation
    vec3 absNormal = abs(vOriginalNormal);
    float maxComp = max(max(absNormal.x, absNormal.y), absNormal.z);
    
    // Identify which face this fragment belongs to based on original normal
    int faceId = 0;
    
    // X-faces
    if (absNormal.x > 0.7 && absNormal.x >= maxComp) {
        faceId = vOriginalNormal.x > 0.0 ? 1 : 2; // right : left
    } 
    // Y-faces
    else if (absNormal.y > 0.7 && absNormal.y >= maxComp) {
        faceId = vOriginalNormal.y > 0.0 ? 3 : 4; // top : bottom
    } 
    // Z-faces
    else if (absNormal.z > 0.7 && absNormal.z >= maxComp) {
        faceId = vOriginalNormal.z > 0.0 ? 5 : 6; // front : back
    }
    
    // Choose colors as specified for each letter face
    vec3 color;
    
    if (vObjectIndex < 0.5) { // H - Purple, Teal, Maroon, Blue
        if (faceId == 1) {
            color = vec3(0.5, 0.0, 0.5);   // Right - Purple
        } else if (faceId == 2) {
            color = vec3(0.0, 0.5, 0.5);   // Left - Teal
        } else if (faceId == 3) {
            color = vec3(0.0, 0.0, 0.8);   // Top - Blue
        } else if (faceId == 4) {
            color = vec3(0.5, 0.0, 0.0);   // Bottom - Maroon
        } else if (faceId == 5) {
            color = vec3(0.3, 0.0, 0.3);   // Front - Dark Purple
        } else if (faceId == 6) {
            color = vec3(0.0, 0.4, 0.7);   // Back - Light Blue
        } else {
            color = vec3(0.4, 0.2, 0.6);   // Default - Lavender
        }
    } else if (vObjectIndex < 1.5) { // O - White, Gray, Pink, Silver
        if (faceId == 1) {
            color = vec3(1.0, 1.0, 1.0);   // Right - White
        } else if (faceId == 2) {
            color = vec3(0.5, 0.5, 0.5);   // Left - Gray
        } else if (faceId == 3) {
            color = vec3(1.0, 0.75, 0.8);  // Top - Pink
        } else if (faceId == 4) {
            color = vec3(0.75, 0.75, 0.75); // Bottom - Silver
        } else if (faceId == 5) {
            color = vec3(0.9, 0.9, 0.9);   // Front - Off-white
        } else if (faceId == 6) {
            color = vec3(0.6, 0.6, 0.6);   // Back - Light gray
        } else {
            color = vec3(0.8, 0.7, 0.7);   // Default - Light pink gray
        }
    } else { // N - Red, Orange, Light Green, Dark Blue
        if (faceId == 1) {
            color = vec3(1.0, 0.0, 0.0);   // Right - Red
        } else if (faceId == 2) {
            color = vec3(1.0, 0.5, 0.0);   // Left - Orange
        } else if (faceId == 3) {
            color = vec3(0.5, 0.8, 0.5);   // Top - Light Green
        } else if (faceId == 4) {
            color = vec3(0.0, 0.0, 0.5);   // Bottom - Dark Blue
        } else if (faceId == 5) {
            color = vec3(0.9, 0.6, 0.1);   // Front - Light Orange
        } else if (faceId == 6) {
            color = vec3(0.1, 0.5, 0.1);   // Back - Dark Green
        } else {
            color = vec3(0.7, 0.3, 0.0);   // Default - Brown
        }
    }
    
    gl_FragColor = vec4(color, 1.0);
}
`;

// Create shader program
const vertexShader = WebGLUtils.createShader(
  gl,
  vertexShaderSource,
  gl.VERTEX_SHADER
);
const fragmentShader = WebGLUtils.createShader(
  gl,
  fragmentShaderSource,
  gl.FRAGMENT_SHADER
);
const shaderProgram = WebGLUtils.createProgram(
  gl,
  vertexShader,
  fragmentShader
);

// Get shader attribute and uniform locations
const programInfo = {
  program: shaderProgram,
  attribLocations: {
    position: gl.getAttribLocation(shaderProgram, "aPosition"),
    normal: gl.getAttribLocation(shaderProgram, "aNormal"),
    objectIndex: gl.getAttribLocation(shaderProgram, "aObjectIndex"),
  },
  uniformLocations: {
    projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
    modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
    modelMatrix: gl.getUniformLocation(shaderProgram, "uModelMatrix"),
    isPerspective: gl.getUniformLocation(shaderProgram, "uIsPerspective"),
  },
};

// Create buffer objects
const buffers = {
  letters: [],
};

/**
 * Load the model data from JSON file
 */
async function loadModel() {
  try {
    const response = await fetch("HON.json");
    modelData = await response.json();
    console.log("Model loaded:", modelData);

    // Once the model is loaded, set up the buffers
    setupBuffers();

    // Start rendering
    requestAnimationFrame(render);
  } catch (error) {
    console.error("Error loading model:", error);
  }
}

/**
 * Process the model data and set up WebGL buffers
 */
function setupBuffers() {
  if (!modelData) return;
  buffers.letters = [];

  // Print the raw JSON to understand the structure
  console.log(
    "Full model data:",
    JSON.stringify(modelData, null, 2).substring(0, 500) + "..."
  );

  // Define our letter processors separately with direct object access
  setupLetterH();
  setupLetterO();
  setupLetterN();

  console.log("Created letter buffers:", buffers.letters);
}

/**
 * Setup letter H from the first object in the model plus some from O
 */
function setupLetterH() {
  console.log("Setting up letter H (with extra parts from O)");
  if (!modelData || !modelData.objects || modelData.objects.length < 2) return;

  const hObject = modelData.objects[0]; // First object is H
  const oObject = modelData.objects[1]; // Second object is O (we'll steal from this)

  // Process all vertices and normals for H
  const vertices = [];
  const normals = [];

  // Process each face in H
  console.log(`Processing ${hObject.faces.length} faces from H`);

  // Process original H geometry
  for (let faceIndex = 0; faceIndex < hObject.faces.length; faceIndex++) {
    const face = hObject.faces[faceIndex];
    console.log(
      `Processing H original face ${faceIndex}: ${JSON.stringify(face)}`
    );

    if (face.vertices && face.vertices.length >= 3) {
      if (face.vertices.length === 3) {
        for (let i = 0; i < 3; i++) {
          const vIdx = face.vertices[i];
          const nIdx =
            face.normals && face.normals[i] !== undefined ? face.normals[i] : 0;

          if (
            vIdx >= 0 &&
            vIdx < modelData.vertices.length &&
            modelData.vertices[vIdx]
          ) {
            vertices.push(...modelData.vertices[vIdx]);
            console.log(
              `  Added vertex ${vIdx}: [${modelData.vertices[vIdx].join(", ")}]`
            );
          } else {
            console.error(`  Invalid vertex index ${vIdx} for H`);
            vertices.push(0, 0, 0);
          }

          if (
            nIdx >= 0 &&
            nIdx < modelData.normals.length &&
            modelData.normals[nIdx]
          ) {
            normals.push(...modelData.normals[nIdx]);
          } else {
            console.error(`  Invalid normal index ${nIdx} for H`);
            normals.push(0, 0, 1);
          }
        }
      } else if (face.vertices.length === 4) {
        console.log(
          `  Converting quad to triangles: ${face.vertices.join(", ")}`
        );

        for (let idx of [0, 1, 2]) {
          const vIdx = face.vertices[idx];
          const nIdx =
            face.normals && face.normals[idx] !== undefined
              ? face.normals[idx]
              : 0;

          if (
            vIdx >= 0 &&
            vIdx < modelData.vertices.length &&
            modelData.vertices[vIdx]
          ) {
            vertices.push(...modelData.vertices[vIdx]);
          } else {
            console.error(`  Invalid vertex index ${vIdx} for H`);
            vertices.push(0, 0, 0);
          }

          if (
            nIdx >= 0 &&
            nIdx < modelData.normals.length &&
            modelData.normals[nIdx]
          ) {
            normals.push(...modelData.normals[nIdx]);
          } else {
            console.error(`  Invalid normal index ${nIdx} for H`);
            normals.push(0, 0, 1);
          }
        }

        for (let idx of [0, 2, 3]) {
          const vIdx = face.vertices[idx];
          const nIdx =
            face.normals && face.normals[idx] !== undefined
              ? face.normals[idx]
              : 0;

          if (
            vIdx >= 0 &&
            vIdx < modelData.vertices.length &&
            modelData.vertices[vIdx]
          ) {
            vertices.push(...modelData.vertices[vIdx]);
          } else {
            console.error(`  Invalid vertex index ${vIdx} for H`);
            vertices.push(0, 0, 0);
          }

          if (
            nIdx >= 0 &&
            nIdx < modelData.normals.length &&
            modelData.normals[nIdx]
          ) {
            normals.push(...modelData.normals[nIdx]);
          } else {
            console.error(`  Invalid normal index ${nIdx} for H`);
            normals.push(0, 0, 1);
          }
        }
      }
    } else {
      console.error(`  Invalid face format at index ${faceIndex}`);
    }
  }

  // Now explicitly process the first 6 faces from O into H (instead of 4)
  console.log(
    "Adding ALL excluded parts of O geometry to H with special handling"
  );
  const facesToTake = Math.min(6, oObject.faces.length); // Take all 6 faces (changed from 4)
  console.log(
    `Taking first ${facesToTake} faces from O for H (O has ${oObject.faces.length} total faces)`
  );

  // Process all 6 faces from O into H (including the 2 that were previously unused)
  for (let i = 0; i < facesToTake; i++) {
    const face = oObject.faces[i];
    console.log(
      `Processing O face ${i} for H: vertices=${face.vertices.join(
        ","
      )} normals=${face.normals ? face.normals.join(",") : "none"}`
    );

    if (face.vertices.length === 4) {
      // This is a quad
      const triangles = [
        [0, 1, 2],
        [0, 2, 3],
      ];

      for (const indices of triangles) {
        for (const vertexIndex of indices) {
          const vIdx = face.vertices[vertexIndex];
          const nIdx =
            face.normals && face.normals[vertexIndex] !== undefined
              ? face.normals[vertexIndex]
              : 0;

          if (vIdx >= 0 && vIdx < modelData.vertices.length) {
            vertices.push(...modelData.vertices[vIdx]);
            console.log(
              `  Added vertex ${vIdx}: ${modelData.vertices[vIdx].join(",")}`
            );
          } else {
            console.error(`  Invalid vertex index in O face: ${vIdx}`);
            vertices.push(0, 0, 0);
          }

          if (nIdx >= 0 && nIdx < modelData.normals.length) {
            normals.push(...modelData.normals[nIdx]);
          } else {
            console.error(`  Invalid normal index in O face: ${nIdx}`);
            normals.push(0, 1, 0);
          }
        }
      }
    } else if (face.vertices.length === 3) {
      // This is a triangle
      for (let j = 0; j < 3; j++) {
        const vIdx = face.vertices[j];
        const nIdx =
          face.normals && face.normals[j] !== undefined ? face.normals[j] : 0;

        if (vIdx >= 0 && vIdx < modelData.vertices.length) {
          vertices.push(...modelData.vertices[vIdx]);
          console.log(
            `  Added vertex ${vIdx}: ${modelData.vertices[vIdx].join(",")}`
          );
        } else {
          console.error(`  Invalid vertex index in O face: ${vIdx}`);
          vertices.push(0, 0, 0);
        }

        if (nIdx >= 0 && nIdx < modelData.normals.length) {
          normals.push(...modelData.normals[nIdx]);
        } else {
          console.error(`  Invalid normal index in O face: ${nIdx}`);
          normals.push(0, 1, 0);
        }
      }
    } else {
      console.warn(`  Skipping face with ${face.vertices.length} vertices`);
    }
  }

  // Calculate center
  const vertexCount = vertices.length / 3;
  let center = [0, 0, 0];

  if (vertexCount > 0) {
    for (let i = 0; i < vertices.length; i += 3) {
      center[0] += vertices[i];
      center[1] += vertices[i + 1];
      center[2] += vertices[i + 2];
    }
    center = center.map((c) => c / vertexCount);
  }

  console.log(`Letter H has ${vertexCount} vertices with center [${center}]`);

  // Create GL buffers
  if (vertexCount > 0) {
    createLetterBuffers("H", vertices, normals, center);
  }
}

/**
 * Setup letter O from the second object in the model plus parts from N
 */
function setupLetterO() {
  console.log(
    "Setting up letter O (with minimal original geometry and more from N)"
  );
  if (!modelData || !modelData.objects || modelData.objects.length < 3) return;

  const oObject = modelData.objects[1]; // Second object is O
  const nObject = modelData.objects[2]; // Third object is N (we'll steal from this)

  // Process all vertices and normals for O
  const vertices = [];
  const normals = [];

  // IMPORTANT: First 6 faces are now used by letter H, so they must be skipped
  // (previously we skipped 6 total, but only used 4 for H - now we use all 6)
  const facesForH = 6; // These MUST match the number taken in setupLetterH (changed from 4)
  const facesToSkip = facesForH; // Skip all 6 faces (all given to H now)
  const remainingFaces = oObject.faces.slice(facesToSkip);

  console.log(`Skipping first ${facesForH} faces (all used by H now)`);
  console.log(`Processing ${remainingFaces.length} remaining O faces`);

  remainingFaces.forEach((face) => {
    if (face.vertices.length === 3) {
      // Triangle
      for (let i = 0; i < 3; i++) {
        const vIdx = face.vertices[i];
        const nIdx =
          face.normals && face.normals[i] !== undefined ? face.normals[i] : 0;

        // Add vertex and normal
        if (modelData.vertices[vIdx]) {
          vertices.push(...modelData.vertices[vIdx]);
        } else {
          vertices.push(0, 0, 0); // Default
          console.warn(`Missing vertex ${vIdx} for O`);
        }

        if (modelData.normals[nIdx]) {
          normals.push(...modelData.normals[nIdx]);
        } else {
          normals.push(0, 0, 1); // Default
          console.warn(`Missing normal ${nIdx} for O`);
        }
      }
    } else if (face.vertices.length === 4) {
      // Quad
      // Convert to two triangles: (0,1,2) and (0,2,3)
      [
        [0, 1, 2],
        [0, 2, 3],
      ].forEach((tri) => {
        tri.forEach((idx) => {
          const vIdx = face.vertices[idx];
          const nIdx =
            face.normals && face.normals[idx] !== undefined
              ? face.normals[idx]
              : 0;

          // Add vertex and normal
          if (modelData.vertices[vIdx]) {
            vertices.push(...modelData.vertices[vIdx]);
          } else {
            vertices.push(0, 0, 0); // Default
            console.warn(`Missing vertex ${vIdx} for O`);
          }

          if (modelData.normals[nIdx]) {
            normals.push(...modelData.normals[nIdx]);
          } else {
            normals.push(0, 0, 1); // Default
            console.warn(`Missing normal ${nIdx} for O`);
          }
        });
      });
    }
  });

  // Add faces from N to O
  console.log("Adding N geometry to O");
  const facesToTake = Math.min(18, nObject.faces.length);

  for (let i = 0; i < facesToTake; i++) {
    const face = nObject.faces[i];

    if (face.vertices.length === 3) {
      for (let j = 0; j < 3; j++) {
        const vIdx = face.vertices[j];
        const nIdx =
          face.normals && face.normals[j] !== undefined ? face.normals[j] : 0;

        // Add vertex and normal
        if (modelData.vertices[vIdx]) {
          vertices.push(...modelData.vertices[vIdx]);
        } else {
          vertices.push(0, 0, 0); // Default if missing
          console.warn(`Missing vertex ${vIdx} for O (from N)`);
        }

        if (modelData.normals[nIdx]) {
          normals.push(...modelData.normals[nIdx]);
        } else {
          normals.push(0, 0, 1); // Default normal
          console.warn(`Missing normal ${nIdx} for O (from N)`);
        }
      }
    } else if (face.vertices.length === 4) {
      // Quad
      // Convert to two triangles: (0,1,2) and (0,2,3)
      [
        [0, 1, 2],
        [0, 2, 3],
      ].forEach((tri) => {
        tri.forEach((idx) => {
          const vIdx = face.vertices[idx];
          const nIdx =
            face.normals && face.normals[idx] !== undefined
              ? face.normals[idx]
              : 0;

          // Add vertex and normal
          if (modelData.vertices[vIdx]) {
            vertices.push(...modelData.vertices[vIdx]);
          } else {
            vertices.push(0, 0, 0); // Default
            console.warn(`Missing vertex ${vIdx} for O (from N)`);
          }

          if (modelData.normals[nIdx]) {
            normals.push(...modelData.normals[nIdx]);
          } else {
            normals.push(0, 0, 1); // Default
            console.warn(`Missing normal ${nIdx} for O (from N)`);
          }
        });
      });
    }
  }

  // Calculate center
  const vertexCount = vertices.length / 3;
  let center = [0, 0, 0];

  if (vertexCount > 0) {
    for (let i = 0; i < vertices.length; i += 3) {
      center[0] += vertices[i];
      center[1] += vertices[i + 1];
      center[2] += vertices[i + 2];
    }
    center = center.map((c) => c / vertexCount);
  }

  console.log(`Letter O has ${vertexCount} vertices with center [${center}]`);

  // Create GL buffers
  if (vertexCount > 0) {
    createLetterBuffers("O", vertices, normals, center);
  }
}

/**
 * Setup letter N from the third object in the model
 */
function setupLetterN() {
  console.log("Setting up letter N (using only minimal remaining geometry)");
  if (!modelData || !modelData.objects || modelData.objects.length < 3) return;

  const nObject = modelData.objects[2]; // Third object is N

  // Process all vertices and normals for N
  const vertices = [];
  const normals = [];

  // Process each face in N, but SKIP the first 18 faces (given to O) - increased from 12
  const facesToSkip = 18;

  nObject.faces.forEach((face, index) => {
    // Skip the first several faces that were given to O
    if (index < facesToSkip) {
      return;
    }

    if (face.vertices.length === 3) {
      for (let i = 0; i < 3; i++) {
        const vIdx = face.vertices[i];
        const nIdx =
          face.normals && face.normals[i] !== undefined ? face.normals[i] : 0;

        // Add vertex and normal
        if (modelData.vertices[vIdx]) {
          vertices.push(...modelData.vertices[vIdx]);
        } else {
          vertices.push(0, 0, 0); // Default
          console.warn(`Missing vertex ${vIdx} for N`);
        }

        if (modelData.normals[nIdx]) {
          normals.push(...modelData.normals[nIdx]);
        } else {
          normals.push(0, 0, 1); // Default
          console.warn(`Missing normal ${nIdx} for N`);
        }
      }
    } else if (face.vertices.length === 4) {
      // Quad
      // Convert to two triangles: (0,1,2) and (0,2,3)
      [
        [0, 1, 2],
        [0, 2, 3],
      ].forEach((tri) => {
        tri.forEach((idx) => {
          const vIdx = face.vertices[idx];
          const nIdx =
            face.normals && face.normals[idx] !== undefined
              ? face.normals[idx]
              : 0;

          // Add vertex and normal
          if (modelData.vertices[vIdx]) {
            vertices.push(...modelData.vertices[vIdx]);
          } else {
            vertices.push(0, 0, 0); // Default
            console.warn(`Missing vertex ${vIdx} for N`);
          }

          if (modelData.normals[nIdx]) {
            normals.push(...modelData.normals[nIdx]);
          } else {
            normals.push(0, 0, 1); // Default
            console.warn(`Missing normal ${nIdx} for N`);
          }
        });
      });
    }
  });

  // Calculate center
  const vertexCount = vertices.length / 3;
  let center = [0, 0, 0];

  if (vertexCount > 0) {
    for (let i = 0; i < vertices.length; i += 3) {
      center[0] += vertices[i];
      center[1] += vertices[i + 1];
      center[2] += vertices[i + 2];
    }
    center = center.map((c) => c / vertexCount);
  }

  console.log(`Letter N has ${vertexCount} vertices with center [${center}]`);

  // Create GL buffers
  if (vertexCount > 0) {
    createLetterBuffers("N", vertices, normals, center);
  }
}

/**
 * Helper to create WebGL buffers for a letter
 */
function createLetterBuffers(letterName, vertices, normals, center) {
  const letterIndex = letterName === "H" ? 0 : letterName === "O" ? 1 : 2;
  const vertexCount = vertices.length / 3;

  // Create position buffer
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // Create normal buffer
  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  // Create object index buffer for coloring
  const objectIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, objectIndexBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(new Array(vertexCount).fill(letterIndex)),
    gl.STATIC_DRAW
  );

  // Store letter buffer data
  buffers.letters.push({
    name: letterName,
    buffers: {
      position: positionBuffer,
      normal: normalBuffer,
      objectIndex: objectIndexBuffer,
    },
    vertexCount: vertexCount,
    center: center,
  });
}

/**
 * Draw the scene
 */
function drawScene(timestamp) {
  if (!modelData || !buffers.letters) return;

  // Match canvas resolution to display size for crisp rendering
  resizeCanvasToDisplaySize();

  // Calculate delta time for smooth animation
  const deltaTime =
    lastTimestamp === 0 ? 0.016 : (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  // Update rotation angles
  hAngle += deltaTime * Math.abs(hRotationSpeed);
  oAngle -= deltaTime * Math.abs(oRotationSpeed);
  nAngle += deltaTime * Math.abs(nRotationSpeed);

  // Clear the canvas
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Set up camera matrices
  const aspect = canvas.width / canvas.height;
  const projectionMatrix = mat4.create();

  if (isPerspective) {
    mat4.perspective(projectionMatrix, Math.PI / 6, aspect, 1.0, 100.0);
  } else {
    const scale = 25.0;
    mat4.ortho(
      projectionMatrix,
      -scale * aspect,
      scale * aspect,
      -scale,
      scale,
      0.1,
      100.0
    );
  }

  // Create view matrix
  const viewMatrix = mat4.create();
  mat4.translate(viewMatrix, viewMatrix, [0, 0, -60.0]); // Move camera further back

  // Use shader program
  gl.useProgram(programInfo.program);

  // Set shared uniforms
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix
  );
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    viewMatrix
  );
  gl.uniform1i(
    programInfo.uniformLocations.isPerspective,
    isPerspective ? 1 : 0
  );

  // Use extreme spacing between letters (50 units)
  const positions = [
    [-15.0, 0.0, 0.0], // H - far left
    [0.0, 0.0, 0.0], // O - center
    [15.0, 0.0, 0.0], // N - far right
  ];

  for (let i = 0; i < buffers.letters.length; i++) {
    const letterBuffer = buffers.letters[i];
    if (!letterBuffer || !letterBuffer.vertexCount) {
      console.warn(`No data for letter ${i}`);
      continue;
    }

    // Clear state from previous letter
    gl.disableVertexAttribArray(programInfo.attribLocations.position);
    gl.disableVertexAttribArray(programInfo.attribLocations.normal);
    gl.disableVertexAttribArray(programInfo.attribLocations.objectIndex);

    // Configure new attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, letterBuffer.buffers.position);
    gl.vertexAttribPointer(
      programInfo.attribLocations.position,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.position);

    gl.bindBuffer(gl.ARRAY_BUFFER, letterBuffer.buffers.normal);
    gl.vertexAttribPointer(
      programInfo.attribLocations.normal,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.normal);

    gl.bindBuffer(gl.ARRAY_BUFFER, letterBuffer.buffers.objectIndex);
    gl.vertexAttribPointer(
      programInfo.attribLocations.objectIndex,
      1,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.objectIndex);

    // Create the letter's model matrix
    const modelMatrix = mat4.create();

    // Use wider spacing for clearer separation of letters
    const position = positions[i];

    // Get rotation data
    const debugSpeed = 1.5;
    const angle = [
      hAngle * debugSpeed,
      oAngle * debugSpeed,
      nAngle * debugSpeed,
    ][i];
    const axis = [hRotationAxis, oRotationAxis, nRotationAxis][i];

    // Position first
    mat4.translate(modelMatrix, modelMatrix, position);

    // Rotate around letter's center
    mat4.translate(modelMatrix, modelMatrix, letterBuffer.center);
    mat4.rotate(modelMatrix, modelMatrix, angle, axis);
    mat4.translate(modelMatrix, modelMatrix, [
      -letterBuffer.center[0],
      -letterBuffer.center[1],
      -letterBuffer.center[2],
    ]);

    // Update the model matrix uniform
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelMatrix,
      false,
      modelMatrix
    );

    // Draw this letter
    gl.drawArrays(gl.TRIANGLES, 0, letterBuffer.vertexCount);
  }
}

/**
 * Ensure canvas resolution matches display size
 */
function resizeCanvasToDisplaySize() {
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    console.log(`Canvas resized to ${displayWidth}x${displayHeight}`);
    return true;
  }
  return false;
}

/**
 * Animation render loop
 */
function render(timestamp) {
  drawScene(timestamp);
  requestAnimationFrame(render);
}

/**
 * Handle UI control events
 */
function setupEventListeners() {
  // Handle projection mode toggles
  perspectiveButton.addEventListener("click", () => {
    isPerspective = true;
    perspectiveButton.classList.add("active");
    orthogonalButton.classList.remove("active");
  });

  orthogonalButton.addEventListener("click", () => {
    isPerspective = false;
    orthogonalButton.classList.add("active");
    perspectiveButton.classList.remove("active");
  });

  // Handle rotation speed changes
  hRotationSpeedInput.addEventListener("input", () => {
    hRotationSpeed = parseFloat(hRotationSpeedInput.value) / 50;
  });

  oRotationSpeedInput.addEventListener("input", () => {
    oRotationSpeed = parseFloat(oRotationSpeedInput.value) / 50;
  });

  nRotationSpeedInput.addEventListener("input", () => {
    nRotationSpeed = parseFloat(nRotationSpeedInput.value) / 50;
  });

  // Handle rotation axis changes
  hRotationAxisSelect.addEventListener("change", () => {
    hRotationAxis = getAxisVector(hRotationAxisSelect.value);
  });

  oRotationAxisSelect.addEventListener("change", () => {
    oRotationAxis = getAxisVector(oRotationAxisSelect.value);
  });

  nRotationAxisSelect.addEventListener("change", () => {
    nRotationAxis = getAxisVector(nRotationAxisSelect.value);
  });
}

// Initialize the application
function init() {
  if (!gl) {
    alert("Unable to initialize WebGL. Your browser may not support it.");
    return;
  }

  // Setup event listeners for controls
  setupEventListeners();

  // Load the model
  loadModel();
}

// Start the application when the page loads
window.onload = init;
