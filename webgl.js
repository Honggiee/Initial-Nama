/**
 * WebGL utility functions for shader compilation and program creation
 */

const WebGLUtils = {
    /**
     * Creates and compiles a shader
     * @param {WebGLRenderingContext} gl - The WebGL context
     * @param {string} source - The GLSL source code for the shader
     * @param {number} type - The type of shader (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
     * @return {WebGLShader} The compiled shader
     */
    createShader: function(gl, source, type) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      
      // Check if the compilation was successful
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shader: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      
      return shader;
    },
    
    /**
     * Creates a program with the given vertex and fragment shaders
     * @param {WebGLRenderingContext} gl - The WebGL context
     * @param {WebGLShader} vertexShader - The compiled vertex shader
     * @param {WebGLShader} fragmentShader - The compiled fragment shader
     * @return {WebGLProgram} The created program
     */
    createProgram: function(gl, vertexShader, fragmentShader) {
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      
      // Check if the linking was successful
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        return null;
      }
      
      return program;
    },
    
    /**
     * Initializes a WebGL context with the given canvas
     * @param {HTMLCanvasElement} canvas - The canvas element
     * @return {WebGLRenderingContext} The WebGL context
     */
    initWebGL: function(canvas) {
      let gl = null;
      try {
        // Try to grab the standard context. If it fails, fallback to experimental.
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      } catch(e) {
        console.error('Unable to initialize WebGL. Your browser may not support it.');
      }
      
      if (!gl) {
        console.error('Unable to initialize WebGL. Your browser may not support it.');
        return null;
      }
      
      return gl;
    },
    
    /**
     * Resizes the canvas to match its display size
     * @param {HTMLCanvasElement} canvas - The canvas element
     */
    resizeCanvasToDisplaySize: function(canvas) {
      // Look up the size the browser is displaying the canvas
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      
      // Check if the canvas is not the same size
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        // Make the canvas the same size
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }
    }
  }; 