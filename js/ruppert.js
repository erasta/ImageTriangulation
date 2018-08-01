$(document).ready(function () {
  var img = document.getElementById('img');
  var canvas2 = document.createElement('canvas');
  canvas2.width = img.width;
  canvas2.height = img.height;
  canvas2.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
  var pixelData = canvas2.getContext('2d').getImageData(0, 0, img.width, img.height).data;
  // debugger

  function channel(pos, c) {
    return pixelData[(pos[0] * img.width + pos[1]) * 4 + c];
  }

  function pixheight(pos) {
    return channel(pos, 0) + channel(pos, 1) + channel(pos, 2);
  }

  function cross3(a, b) {
    var ax = a[0], ay = a[1], az = a[2];
    var bx = b[0], by = b[1], bz = b[2];
    var x = ay * bz - az * by;
    var y = az * bx - ax * bz;
    var z = ax * by - ay * bx;
    return [x, y, z];
  }

  function sub3(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  function norm3(v) {
    var d = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    d = d || 1;
    return [v[0] / d, v[1] / d, v[2] / d];
  }

  function dot3(u, v) {
    return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  }

  function isBadOnImage(a, b, c) {
    var center = [(a[0] + b[0] + c[0]) / 3.0, (a[1] + b[1] + c[1]) / 3.0];
    var ah = pixheight(a), bh = pixheight(b), ch = pixheight(c);
    var cenh = pixheight(center);

    var pn = norm3(cross3(sub3(c, b), sub3(a, b)));
    var pd = -dot3(a, pn);

    var linestart = [center[0], center[1], 0];
    var direction = [0,0,1];//line.delta( v1 );
    var denominator = pn[2];//this.normal.dot( direction );
    var imh = - ( dot3(linestart, pn) + pd ) / denominator;
    return Math.abs(imh - cenh) > 1;
  }

  var canvas = $('#canvas');

  var vertices = [[0, 0],[0, img.height],[img.width, img.height],[img.width, 0]];
  Graph.fitVerticesInto(vertices, canvas.width(), canvas.height());
  var edges = [[0, 2]];
  Graph.markFixed(edges);
  Graph.markExternal(edges);
  var face = [[0, 1, 2, 3]];

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
  edges = edges.concat(diags);
  var qe = triangulate.makeQuadEdge(vertices, edges);
  triangulate.refineToDelaunay(vertices, edges, qe.coEdges, qe.sideEdges);
  var trace = [];
  var verticesBackup = vertices.slice();
  var edgesBackup = edges.slice();
  var coEdges0 = [];
  var sideEdges0 = [];
  for (var j = 0; j < edges.length; ++j) {
    coEdges0[j] = qe.coEdges[j].slice();
    sideEdges0[j] = qe.sideEdges[j].slice();
  }
  triangulate.refineToRuppert(vertices, edges, qe.coEdges, qe.sideEdges, {
    minAngle: 30,
    maxSteinerPoints: 300,
    trace: trace,
    isBad: isBadOnImage
  });

  g = new Graph(vertices, edges, [face]);
  g.draw(canvas);//, { edgeNumbers: true });

  $('#show-steps-button').click(function () {
    var vertices = verticesBackup.slice();
    var edges = edgesBackup.slice();
    var coEdges = [];
    var sideEdges = [];
    for (var j = 0; j < edges.length; ++j) {
      coEdges[j] = coEdges0[j].slice();
      sideEdges[j] = sideEdges0[j].slice();
    }
    var g = new Graph(vertices, edges, [face]);
    canvas.clearCanvas();
    g.draw(canvas, { edgeNumbers: true });
    var l = 0;
    var interval = setInterval(function () {
      console.log("tick: %d", l);
      if (l < trace.length) {
        var t = trace[l];
        ++l;
        if (t.split !== undefined) {
          for (var s = 0; s < t.split.length; ++s) {
            var j = t.split[s];
            triangulate.splitEdge(vertices, edges, coEdges, sideEdges, j);
          }
        }
        if (t.insert !== undefined) {
          var k = t.insert % 2, j = (t.insert - k) / 2;
          var a = vertices[edges[j][0]];
          var b = vertices[coEdges[j][k]];
          var c = vertices[edges[j][1]];
          var p = geom.circumcenter(a, b, c);
          var insert = triangulate.tryInsertPoint(
            vertices, edges, coEdges, sideEdges, p, j);
          console.log("insert j: %d, i: %d", j, coEdges[j][k]);
        }
        if (edges.length != t.edgeCnt)
          console.log("Oh no!");
        canvas.clearCanvas();
        g.draw(canvas);//, { edgeNumbers: true });
      } else {
        clearInterval(interval);
      }
    }, 50);
  });

  $('#canvas').click(function (event) {
    var m = [event.pageX - canvas.offset().left, event.pageY - canvas.offset().top];
    console.log(g.getVertexAt(m));
  })

})
