'use strict';

var start;
var vertices, edges, face;
var canvas;
var lineColor = 'white';
var imageData;

function* dowork() {
  start = Date.now();
  var img = document.getElementById('img');
  imageData = loadImage(img);
  var pixelData = imageData.data;
  yield 'got image ' + img.width + 'x' + img.height;
  // Sobel constructor returns an Uint8ClampedArray with sobel data
  var sobelData = Sobel(imageData);
  yield 'done Sobel';

  // [sobelData].toImageData() returns a new ImageData object
  var sobelImageData = sobelData.toImageData();
  var sobelPixels = sobelImageData.data;

  function pixsobel(x, y) {
    var ximage = Math.floor(x), yimage = Math.floor(y);
    var off = (ximage + img.width * yimage) * 4;
    return sobelPixels[off];
  }

  // var xtop = 2*(img.width - 1), ytop = 2*(img.height - 1);
  var xtop = img.width - 1, ytop = img.height - 1;

  function pixheight(x, y) {
    // var ximage = Math.floor(x / 2), yimage = Math.floor(y / 2);
    var ximage = Math.floor(x), yimage = Math.floor(y);
    var off = (ximage + img.width * yimage) * 4;
    return pixelData[off + 0] + pixelData[off + 1] + pixelData[off + 2];
  }

  var plane = new THREE.Plane();
  var va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  var vm = new THREE.Vector3(), vo = new THREE.Vector3();
  var line = new THREE.Line3();
  line.end = vm;
  function isBadOnImage(a, b, c) {
    va.set(a[0], a[1], pixheight(a[0], a[1]));
    vb.set(b[0], b[1], pixheight(b[0], b[1]));
    vc.set(c[0], c[1], pixheight(c[0], c[1]));
    var xm = (va.x + vb.x + vc.x) / 3.0;
    var ym = (va.y + vb.y + vc.y) / 3.0;
    vm.set(xm, ym, pixheight(xm, ym));
    plane.setFromCoplanarPoints(va, vb, vc);
    line.start.set(xm, ym, 0);
    plane.intersectLine(line, vo);
    return Math.abs(vo.z - vm.z) > 10;
  }

  canvas = $('#canvas');

  vertices = [[0, 0], [0, ytop], [xtop, ytop], [xtop, 0]];
  Graph.fitVerticesInto(vertices, canvas.width(), canvas.height());
  edges = [[0, 1], [1, 2], [2, 3], [3, 0]];
  Graph.markFixed(edges);
  Graph.markExternal(edges);
  face = [[0, 1, 2, 3]];
  yield 'prepare graph';

  var diags = triangulate.face(vertices, face);
  yield 'triangulate.face';

  edges = edges.concat(diags);
  var qe = triangulate.makeQuadEdge(vertices, edges);
  yield 'makeQuadEdge';

  triangulate.refineToDelaunay(vertices, edges, qe.coEdges, qe.sideEdges);
  yield 'refineToDelaunay';
  var trace = [];
  var coEdges0 = [];
  var sideEdges0 = [];
  for (var j = 0; j < edges.length; ++j) {
    coEdges0[j] = qe.coEdges[j].slice();
    sideEdges0[j] = qe.sideEdges[j].slice();
  }
  yield 'slice edges';

  var sensitivity = Number($('#Sensitivity').val());
  var iterations = Number($('#Iterations').val());

  var steinerPts = [];
  for (var y = 0; y < img.height; ++y) {
    for (var x = 0; x < img.width; ++x) {
      if (pixsobel(x, y) > sensitivity) {
        steinerPts.push([x, y]);
      }
    }
  }
  yield 'add sobel extreme to steiner points';

  yield* triangulate.refineToRuppert(vertices, edges, qe.coEdges, qe.sideEdges, {
    minAngle: 30,
    maxSteinerPoints: iterations,
    trace: trace,
    isBad: isBadOnImage,
    forceSteinerPoints: steinerPts
  });
  yield 'Done.';
}

var shouldStop;
function show(txt) {
  $("#log").text(((Date.now() - start) / 1000.0) + "s: " + txt + "\n" + $("#log").text());
}

function getRandomColor() {
  var letters = '0123456789abcdef';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function rgbToHex(r, g, b) {
  if (r > 255 || g > 255 || b > 255)
      throw "Invalid color component";
  return ((r << 16) | (g << 8) | b).toString(16);
}

function getPixelColor(ctx, x, y) {
  var off = (Math.floor(x) + imageData.width * Math.floor(y)) * 4;
  var colors = rgbToHex( imageData.data[off + 0], imageData.data[off + 1], + imageData.data[off + 2]);
  // var p = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
  var hex = "#" + ("000000" + colors).slice(-6);
  return hex;
}

function repaint(color) {
  lineColor = color || lineColor;
  var graphStyle = $("input[name='graph-style']:checked").val();
  $('.sp-container')[0].style.visibility = graphStyle == "edges" ? "" : "hidden";
  if (canvas && vertices && edges && face) {
    var ctx = canvas[0].getContext('2d');
    ctx.drawImage(img, 0, 0, img.width, img.height);
    var g = new Graph(vertices, edges, [face]);
    if (graphStyle == "edges") {
      g.vertexStyle.color = g.edgeStyle.color = lineColor;
      g.draw(canvas);
    } else {
      g.computeFaces();
      if (graphStyle == "random") {
        for (var f = 0; f < g.faces.length - 1; ++f) {
          g.drawFace(canvas, g.faces[f], g.vertices, getRandomColor());
        }
      } else {
        for (var f = 0; f < g.faces.length - 1; ++f) {
          var fc = g.faces[f][0];
          var xx = 0, yy = 0;
          for (var j = 0; j < fc.length; ++j) {
            xx += g.vertices[fc[j]][0] / fc.length;
            yy += g.vertices[fc[j]][1] / fc.length;
          }
          g.drawFace(canvas, g.faces[f], g.vertices, getPixelColor(ctx, xx, yy));
        }
      }
    }
  }
}

function work() {
  var img = $('#img')[0];
  shouldStop = false;
  var gen = dowork();
  function again() {
    setTimeout(() => {
      if (shouldStop) {
        show("Stopped");
        return;
      }
      var txt = gen.next();
      if (txt.done) return;
      show(txt.value);
      repaint();
      again();
    }, 1);
  }
  again();
}

function stop() {
  shouldStop = true;
}