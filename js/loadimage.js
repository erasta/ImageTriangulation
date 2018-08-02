"use strict";

$("document").ready(function () {
    $("#loadImage").change(function (e) {
        var fr = new FileReader();
        fr.onload = function () {
            $("#img")[0].src = fr.result;
        }
        fr.readAsDataURL(e.target.files[0]);
    });
});

function loadImage(img) {
    var canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
    var imageData = canvas.getContext('2d').getImageData(0, 0, img.width, img.height);
    return imageData;
}
