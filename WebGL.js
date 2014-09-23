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
            gl.getExtension("OES_standard_derivatives");
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
    shaderPrograms[2] = generateShader("fragment_display", "vertex_display");
    shaderPrograms[3] = generateShader("fragment1", "vertex_display");
    shaderPrograms[4] = generateShader("fragment2", "vertex_display");
}

function handleLoadedTexture(texture, image) {
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, null);
}

function createBufferTexture (texture, width, height) {
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    //gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_BORDER );
    //gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_BORDER );
    //TODO: "zero outside"
    //gl.texParameteriv( gl.TEXTURE_2D, gl.TEXTURE_BORDER_COLOR, GLblack );
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null );
    gl.bindTexture( gl.TEXTURE_2D, null);
}

function updateInputTexture() {
    handleLoadedTexture(Textures[0], document.getElementById('textCanvas'));
}

var imWidth = 128.0;
var imHeight = imWidth;
var texw = imWidth;
var texh = imHeight;
var Textures = new Array();
function initTextures() {
    Textures[0] = gl.createTexture();
    Textures[0].image = new Image();
    Textures[0].image.src = "test.png";
    // Textures[0].image.onload = function () {
        handleLoadedTexture(Textures[0], Textures[0].image);
        //imWidth = Textures[0].image.width;
        //imHeight = Textures[0].image.height;
        //texw = imWidth;
        //texh = imHeight;
    // }

    Textures[1] = gl.createTexture();
    createBufferTexture(Textures[1], imWidth, imHeight);

    Textures[2] = gl.createTexture();
    createBufferTexture(Textures[2], imWidth, imHeight);
}

var framebuffer;
function initFramebuffer() {
    framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    framebuffer.width = imWidth;
    framebuffer.height = imHeight;
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

function renderScene(shader, width, height) {
    gl.useProgram(shaderPrograms[shader]);

    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexPositionBuffer);
    gl.vertexAttribPointer(shaderPrograms[shader].VertexPosition, quadVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderPrograms[shader].TextureCoord, quadVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //gl.activeTexture(gl.TEXTURE0);
    //gl.uniform1i(shaderPrograms[shader].texture, 0); // Texture unit 0
    //updateShader(shader)

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadVertexIndexBuffer);    

    // Draw the single quad
    gl.drawElements(gl.TRIANGLES, quadVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    gl.useProgram(null);
}

function updateShader(shader){
    gl.useProgram(shaderPrograms[shader]);
    // Zoom and pan the view
    gl.uniform1f(shaderPrograms[shader].uXoffset, xOffset);
    gl.uniform1f(shaderPrograms[shader].uYoffset, yOffset);
    gl.uniform1f(shaderPrograms[shader].uScale, scale);

    //bla bla bla
    gl.uniform1f(shaderPrograms[shader].texw, texw);
    gl.uniform1f(shaderPrograms[shader].texh, texh);
    gl.uniform1f(shaderPrograms[shader].step, stepsize);
    gl.uniform1f(shaderPrograms[shader].texlevels, texlevels);
    
    gl.uniform1f(shaderPrograms[shader].texture, null);
    gl.useProgram(null)
}

var stepsize = 0.0;
var texlevels = 256.0;
//var texlevels = 65536.0;
var lastRendered = 1;
var visShader = 3;
function tempName() {
    stepsize = 0.0;
    updateShader(0);
    gl.bindTexture(gl.TEXTURE_2D, Textures[0]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    lastRendered = 1;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, Textures[lastRendered], null);
    renderScene(0, texw, texh);

    stepsize = (texw > texh ? texw/2.0: texh/2.0);
    while (stepsize > 0.5) {
        //console.log(stepsize);
        updateShader(1);
        gl.bindTexture(gl.TEXTURE_2D, Textures[lastRendered]);
        lastRendered = (lastRendered == 1 ? 2 : 1); // Swap 1 <-> 2
        // Swap which texture is attached to the FBO
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, Textures[lastRendered], null);
        renderScene(1, texw, texh);
        //console.log(stepsize);
        stepsize = stepsize / 2;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, Textures[lastRendered]);
    //gl.bindTexture(gl.TEXTURE_2D, Textures[0]);

    stepsize = 1.0;
    updateShader(visShader);
    renderScene(visShader, gl.viewportWidth, gl.viewportHeight);
}

function tick() {
        requestAnimFrame(tick);
        tempName();
        
}

function shaderChanger(value){
    visShader = value;
}

function getSelectedShader(){
    return visShader;
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
    }
    // "onmousedrag" doesn't work, it seems, hence this kludge
    canvas.onmousemove = function(ev) {
        if(drag == 0) return;
        var xDelta = ev.clientX - xMouseDown;
        var yDelta = ev.clientY - yMouseDown;
        xOffset = xOldOffset + (xDelta / canvas.width / scale * 2.0);
        yOffset = yOldOffset - (yDelta / canvas.height / scale * 2.0); // Flip y axis
    }
    var wheelHandler = function(ev) {
        var factor = 1.1; // Scale increment per click
        if (ev.shiftKey) factor = 1.01;
        scale *= ((ev.detail || ev.wheelDelta) < 0) ? factor : 1.0/factor;
        ev.preventDefault();
    };
    canvas.addEventListener('DOMMouseScroll', wheelHandler, false);
    canvas.addEventListener('mousewheel', wheelHandler, false);

    initGL(canvas);
    initShaders();
    initBuffers();
    initTextures();
    initFramebuffer();
     
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    tempName();
    tick();
}