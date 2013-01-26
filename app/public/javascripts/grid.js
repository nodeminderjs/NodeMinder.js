$(function() {
  $(".draggable").draggable({
    stop: function( event, ui ) {
      saveCamerasCfg();
    }
  });
  $(".resizable").resizable({
    aspectRatio: 320 / 240,
    stop: function( event, ui ) {
      saveCamerasCfg();
    }
  });        
});
 
$(document).ready(function() {
  $("#testButton").click(function() {
    //alert("sas");
    //$('#cam05').width(640).height(480);
    $('#cam05 .ui-wrapper').width(640).height(480);
    $('#cam05 img').width(640).height(480);
  });

  var customCfg = false;

  //$('.camera img').css({ width:'100%', height:'100%' });
  
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
    var w = $(window).width();
    var tw = 320;
    var th = 240 + 27;  // ToDo
    
    $('.camera').each(function(){
      $(this).css({ position: 'absolute',
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
  $('.camera').each(function(){
    var id = $(this).attr('id');
    custom[id] = {};
    var camCfg = custom[id];
    var p = $(this).position();
    camCfg['top'] = p.top;
    camCfg['left'] = p.left;
    camCfg['width'] = $('#' + id + ' .ui-wrapper').width();
    camCfg['height'] = $('#' + id + ' .ui-wrapper').height();
  });
}

function setCamerasCfg(custom) {
  var sel, camCfg;
  for (c in custom) {
    camCfg = custom[c];
    sel = 'div#' + c;
    $(sel).css({ position: 'absolute',
                 marginLeft: 0, marginTop: 0,
                 top: camCfg.top, left: camCfg.left
               });
    $('#' + c + ' .ui-wrapper').width(camCfg.width);
    $('#' + c + ' .ui-wrapper').height(camCfg.height);
    $('#' + c + ' img').width(camCfg.width);
    $('#' + c + ' img').height(camCfg.height);
  }
}

function saveCamerasCfg() {
  var custom = {};
  custom[window.location.pathname] = {};
  getCamerasCfg(custom[window.location.pathname]);
  localStorage.grid_custom = JSON.stringify(custom);
}
