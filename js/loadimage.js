"use strict";

function readImageAsUrl(f) {
    stop();
    var fr = new FileReader();
    fr.onload = function () {
        $("#img")[0].src = fr.result;
    }
    fr.readAsDataURL(f);
}

$("document").ready(function () {
    $("#loadImage").change(function (e) { readImageAsUrl(e.target.files[0]); });

    $(document).on('input', '#Iterations', function (e) { $('#chosenIterations')[0].value = $('#Iterations')[0].value; });
    $(document).on('input', '#Sensitivity', function (e) { $('#chosenSensitivity')[0].value = $('#Sensitivity')[0].value; });

    $(document).on('input', '#widthImage', function (e) {
        $('#img')[0].width = $('#canvas')[0].width = $('#chosenWidth')[0].value = $('#widthImage')[0].value;
        setTimeout(function () {
            $('#canvas')[0].height = $('#chosenHeight')[0].value = $('#img')[0].height;
        }, 10);
    });

    $('#img').on('dragover', function (e) { e.stopPropagation(); e.preventDefault(); });
    $('#img').on('drop', function (e) {
        e.preventDefault();
        readImageAsUrl(e.originalEvent.dataTransfer.files[0]);
    });
});

$('#img4canvas').ready(() => {
    $('#canvas')[0].getContext('2d').drawImage($('#img4canvas')[0], 0, 0);
});

function loadImage(img) {
    var canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
    var imageData = canvas.getContext('2d').getImageData(0, 0, img.width, img.height);
    fixSizesByImage();
    return imageData;
}

function fixSizesByImage() {
    setTimeout(function () {
        $('#canvas')[0].width = $('#chosenWidth')[0].value = $('#widthImage')[0].value = $('#img')[0].width;
        $('#canvas')[0].height = $('#chosenHeight')[0].value = $('#img')[0].height;
    }, 10);
}

// function drop(ev) {
//     ev.preventDefault();
//     debugger;
//     var data = ev.dataTransfer.getData("text");
//     // ev.target.appendChild(document.getElementById(data));
// }

function downloadImage() {
    var download = document.getElementById("download");
    var image = document.getElementById("canvas").toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
    download.setAttribute("href", image);
    //download.setAttribute("download","archive.png");
}

function downloadObj() {
    if (!vertices || !edges || !face) return;
    var g = new Graph(vertices, edges, [face]);
    g.computeFaces();
    var str = "# Vertices\n";
    for (var i = 0; i < vertices.length; ++i) {
        str += "v " + vertices[i].join(' ') + " 0\n";
    }
    str += "# Faces\n";
    for (var f = 0; f < g.faces.length - 1; ++f) {
        var fc = g.faces[f][0];
        str += "f " + g.faces[f][0].map(x => x + 1).join(" ") + "\n";
    }
    var blob = new Blob([str], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "triangulation.obj");
}