/*
* A lot of code from:
* http://webstaff.itn.liu.se/~stegu76/TNM084-2013/webgl-simple/
* written by Stefan Gustavsson
*/
var gl;
function initGL(canvas) {
    try {
            gl = canvas.getContext("experimental-webgl");
            gl.viewportWidth = canvas.width;
            gl.viewportHeight = canvas.height;
        } catch (e) {
        }
        if (!gl) {
            alert("Could not initialise WebGL, sorry :-(");
        }
}

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("GLSL compile error:\n" + gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function generateShader(fid, vid){
    var fShader = getShader(gl, fid);
    var vShader = getShader(gl, vid);

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vShader);
    gl.attachShader(shaderProgram, fShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);
    
    shaderProgram.VertexPosition = gl.getAttribLocation(shaderProgram, "VertexPosition");
    gl.enableVertexAttribArray(shaderProgram.VertexPosition);

    shaderProgram.TextureCoord = gl.getAttribLocation(shaderProgram, "TextureCoord");
    gl.enableVertexAttribArray(shaderProgram.TextureCoord);
    
    shaderProgram.uXoffset = gl.getUniformLocation(shaderProgram, "uXoffset");
    shaderProgram.uYoffset = gl.getUniformLocation(shaderProgram, "uYoffset");
    shaderProgram.uScale = gl.getUniformLocation(shaderProgram, "uScale");
    shaderProgram.texture = gl.getUniformLocation(shaderProgram, "texture");
    
    shaderProgram.texw = gl.getUniformLocation(shaderProgram, "texw");
    shaderProgram.texh = gl.getUniformLocation(shaderProgram, "texh");
    shaderProgram.step = gl.getUniformLocation(shaderProgram, "step");
    shaderProgram.texlevels = gl.getUniformLocation(shaderProgram, "texlevels");

    //gl.useProgram();
    return shaderProgram;
}

var shaderPrograms = new Array();
function initShaders() {
    shaderPrograms[0] = generateShader("fragment_seed", "vertex");
    shaderPrograms[1] = generateShader("fragment_flood", "vertex");
    shaderPrograms[2] = generateShader("fragment_display", "vertex");
    gl.useProgram(shaderPrograms[2]);
}

function handleLoadedTexture(texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     // Image dimensions might be not-powers-of-two (NPOT), so avoid unsupported wrap modes
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Do not generate mipmaps. Mipmaps are not supported for NPOT textures in WebGL.
    gl.bindTexture(gl.TEXTURE_2D, null);
}

var TextureRGBA;
function initTexture() {
    TextureRGBA = gl.createTexture();
    TextureRGBA.image = new Image();
    TextureRGBA.image.onload = function () {
        handleLoadedTexture(TextureRGBA)
    }

    TextureRGBA.image.src = "e.png";
}

var quadVertexPositionBuffer;
var quadVertexTextureCoordBuffer;
var quadVertexIndexBuffer;
function initBuffers() {
    quadVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexPositionBuffer);
    vertices = [
        // One single face to draw the image as a texture
        -1.0, -1.0,  0.0,
         1.0, -1.0,  0.0,
         1.0,  1.0,  0.0,
        -1.0,  1.0,  0.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    quadVertexPositionBuffer.itemSize = 3;
    quadVertexPositionBuffer.numItems = 4;

    quadVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexTextureCoordBuffer);
    var textureCoords = [
      // Stretch unit square for texcoords across the single face
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
    quadVertexTextureCoordBuffer.itemSize = 2;
    quadVertexTextureCoordBuffer.numItems = 4;

    quadVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadVertexIndexBuffer);
    var quadVertexIndices = [
        0, 1, 2,      0, 2, 3    // A single quad, made from two triangles
    ];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(quadVertexIndices), gl.STATIC_DRAW);
    quadVertexIndexBuffer.itemSize = 1;
    quadVertexIndexBuffer.numItems = 6;
}
texw = 512;
texh = 512;
var stepvar = 512/4;
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexPositionBuffer);
    gl.vertexAttribPointer(shaderPrograms[2].VertexPosition, quadVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderPrograms[2].TextureCoord, quadVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, TextureRGBA);
    gl.uniform1i(shaderPrograms[2].texture, 0); // Texture unit 0


    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadVertexIndexBuffer);

    // Zoom and pan the view
    gl.uniform1f(shaderPrograms[2].uXoffset, xOffset);
    gl.uniform1f(shaderPrograms[2].uYoffset, yOffset);
    gl.uniform1f(shaderPrograms[2].uScale, scale);

    //bla bla bla
    gl.uniform1f(shaderPrograms[2].texw, texw);
    gl.uniform1f(shaderPrograms[2].texh, texh);
    gl.uniform1f(shaderPrograms[2].step, stepvar);
    gl.uniform1f(shaderPrograms[2].texlevels, stepvar);

    // Draw the single quad
    gl.drawElements(gl.TRIANGLES, quadVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);   
}

function tick() {
        requestAnimFrame(tick);
        drawScene();
}

var xOffset = 0.0;
var yOffset = 0.0;
var xOldOffset = 0.0;
var yOldOffset = 0.0;
var scale = 1.0;
var xMouseDown;
var yMouseDown;
var drag = 0;
function WebGL() {
    var canvas = document.getElementById("GLCanvas");
    canvas.onmousedown = function(ev) {
        drag = 1;
        xOldOffset = xOffset;
        yOldOffset = yOffset;
        xMouseDown = ev.clientX; 
        yMouseDown = ev.clientY;
    }
    canvas.onmouseup = function(ev) {
        drag = 0;
        var xDelta = ev.clientX - xMouseDown;
        var yDelta = ev.clientY - yMouseDown;
        xOffset = xOldOffset + (xDelta / canvas.width / scale * 2.0);
        yOffset = yOldOffset - (yDelta / canvas.height / scale * 2.0); // Flip y axis
        drawScene();
    }
    // "onmousedrag" doesn't work, it seems, hence this kludge
    canvas.onmousemove = function(ev) {
        if(drag == 0) return;
        var xDelta = ev.clientX - xMouseDown;
        var yDelta = ev.clientY - yMouseDown;
        xOffset = xOldOffset + (xDelta / canvas.width / scale * 2.0);
        yOffset = yOldOffset - (yDelta / canvas.height / scale * 2.0); // Flip y axis
        drawScene();
    }
    var wheelHandler = function(ev) {
        var factor = 1.1; // Scale increment per click
        if (ev.shiftKey) factor = 1.01;
        scale *= ((ev.detail || ev.wheelDelta) < 0) ? factor : 1.0/factor;
        drawScene();
        ev.preventDefault();
    };
    canvas.addEventListener('DOMMouseScroll', wheelHandler, false);
    canvas.addEventListener('mousewheel', wheelHandler, false);

    initGL(canvas);
    initShaders();
    initBuffers();
    initTexture();
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    tick();
}