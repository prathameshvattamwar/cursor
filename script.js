var screen = document.querySelector("body");
var cursor = document.querySelector(".cursor");

screen.addEventListener("mousemove",function(dets){
    cursor.style.left = dets.x + "px";
    cursor.style.top = dets.y + "px";
})
