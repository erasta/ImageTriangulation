var start;
var vertices, edges, face;
var canvas;

function* dowork() {
  start = Date.now();
  var img = document.getElementById('img');
  var imageData = loadImage(img);
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
  var verticesBackup = vertices.slice();
  var edgesBackup = edges.slice();
  var coEdges0 = [];
  var sideEdges0 = [];
  for (var j = 0; j < edges.length; ++j) {
    coEdges0[j] = qe.coEdges[j].slice();
    sideEdges0[j] = qe.sideEdges[j].slice();
  }
  yield 'slice edges';

  var steinerPts = [];
  for (var y = 0; y < img.height; ++y) {
    for (var x = 0; x < img.width; ++x) {
      if (pixsobel(x, y) > 240) {
        steinerPts.push([x, y]);
      }
    }
  }
  yield 'add sobel extreme to steiner points';

  yield* triangulate.refineToRuppert(vertices, edges, qe.coEdges, qe.sideEdges, {
    minAngle: 30,
    maxSteinerPoints: 30000,
    trace: trace,
    isBad: isBadOnImage,
    forceSteinerPoints: steinerPts
  });
  yield 'refineToRuppert';
}

function work() {
  var gen = dowork();
  function again() {
    setTimeout(() => {
      var txt = gen.next();
      if (txt.done) return;
      $("#log").text(((Date.now() - start) / 1000.0) + ": " + txt.value);
      if (canvas && vertices && edges && face) {
        g = new Graph(vertices, edges, [face]);
        g.draw(canvas);
      }
      again();
    }, 1);
  }
  again();
}