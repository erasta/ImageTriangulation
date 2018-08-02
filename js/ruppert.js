var start;
function prn(txt) {
  console.log(((Date.now() - start)/ 1000.0) + ": " + txt);
}

function work() {
  start = Date.now();
  var img = document.getElementById('img');
  var canvas2 = document.createElement('canvas');
  canvas2.width = img.width;
  canvas2.height = img.height;
  canvas2.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
  var imageData = canvas2.getContext('2d').getImageData(0, 0, img.width, img.height);
  var pixelData = imageData.data;
  prn('got image ' + img.width + 'x' + img.height);
  // Sobel constructor returns an Uint8ClampedArray with sobel data
  var sobelData = Sobel(imageData);
  prn('done Sobel');


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

  var canvas = $('#canvas');

  var vertices = [[0, 0], [0, ytop], [xtop, ytop], [xtop, 0]];
  Graph.fitVerticesInto(vertices, canvas.width(), canvas.height());
  var edges = [[0, 1], [1, 2], [2, 3], [3, 0]];
  Graph.markFixed(edges);
  Graph.markExternal(edges);
  var face = [[0, 1, 2, 3]];

  prn('prepare graph');

  // var vertices = [[100, 200],[100, 300],[300, 400],[300, 300],[400, 200],[300, 200],[300, 100],[200, 200],[200, 100],[150, 200],[250, 300],[150, 300]];
  // Graph.fitVerticesInto(vertices, canvas.width(), canvas.height());
  // var edges = [[ 0,  1],[ 1,  2],[ 2,  3],[ 3,  4],[ 4,  5],[ 5,  6],[ 6,  7],[ 7,  8],[ 8,  0],[ 9, 10],[10, 11],[11,  9]];
  // Graph.markFixed(edges);
  // Graph.markExternal(edges);
  // var face = [[0, 1, 2, 3, 4, 5, 6, 7, 8],[9,10,11]];

  // var vertices = Graph.fitVerticesInto(key.vertices, canvas.width(), canvas.height());
  // var edges = key.edges.slice();
  // var face = key.faces[0];
  var diags = triangulate.face(vertices, face);
  prn('triangulate.face');
  edges = edges.concat(diags);
  var qe = triangulate.makeQuadEdge(vertices, edges);
  prn('makeQuadEdge');
  triangulate.refineToDelaunay(vertices, edges, qe.coEdges, qe.sideEdges);
  prn('refineToDelaunay');
  var trace = [];
  var verticesBackup = vertices.slice();
  var edgesBackup = edges.slice();
  var coEdges0 = [];
  var sideEdges0 = [];
  for (var j = 0; j < edges.length; ++j) {
    coEdges0[j] = qe.coEdges[j].slice();
    sideEdges0[j] = qe.sideEdges[j].slice();
  }
  prn('slice edges');

  var steinerPts = [];
  for (var y = 0; y < img.height; ++y) {
    for (var x = 0; x < img.width; ++x) {
      if (pixsobel(x, y) > 240) {
        steinerPts.push([x, y]);
      }
    }
  }
  prn('add sobel extreme to steiner points');

  triangulate.refineToRuppert(vertices, edges, qe.coEdges, qe.sideEdges, {
    minAngle: 30,
    maxSteinerPoints: 30000,
    trace: trace,
    isBad: isBadOnImage,
    forceSteinerPoints: steinerPts
  });
  prn('refineToRuppert');

  g = new Graph(vertices, edges, [face]);
  g.draw(canvas);//, { edgeNumbers: true });
  prn('draw');
}
