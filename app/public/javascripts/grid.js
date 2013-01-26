$(function() {
  $(".draggable").draggable({
    stop: function( event, ui ) {
      var custom = {};
      custom[window.location.pathname] = {};
      getCamerasCfg(custom[window.location.pathname]);
      localStorage.grid_custom = JSON.stringify(custom);
    }
  });
  $(".resizable").resizable({
    aspectRatio: 320 / 240
  });        
});
 
$(document).ready(function() {
  var customCfg = false;

  if (localStorage.grid_custom) {
    var custom = JSON.parse(localStorage.grid_custom);
    if (custom[window.location.pathname])
      customCfg = true;
  }
  if (customCfg) {
    setCamerasCfg(custom[window.location.pathname]);
  }
  else {
    var x = 0;
    var y = 0;
    //var w = $('body').width();
    var w = $(window).width();
    var tw = $('#cam01').width();
    var th = $('#cam01').height() + 22;  // ToDo
    
    $(".camera").each(function(){
      $(this).css({ position: "absolute",
                    marginLeft: 0, marginTop: 0,
                    top: y, left: x });
      x = x + tw;
      if ((x + tw) > w) {
        x = 0;
        y = y + th;
      }
    });
  }
});

function getCamerasCfg(custom) {
  //custom['01'] = 'hahaha';
  $(".camera").each(function(){
    var id = $(this).attr('id');
    custom[id] = {};
    var camCfg = custom[id];
    var p = $(this).position();
    camCfg['top'] = p.top;
    camCfg['left'] = p.left;
  });
}

function setCamerasCfg(custom) {
  for (c in custom) {
    $('#' + c).css({ position: "absolute",
                     marginLeft: 0, marginTop: 0,
                     top: custom[c].top, left: custom[c].left});    
  }
}
