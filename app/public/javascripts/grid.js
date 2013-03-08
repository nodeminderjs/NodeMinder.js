var ctrlDown = false;
var shftDown = false;
var selCam, selWrp, selImg;
var locked = true;
var path = window.location.pathname;
var serverUrl = window.location.protocol + '//' + window.location.host;
var size_info;

function doLock() {
  locked = true;
  $('.draggable').draggable('option', 'disabled', true);
  $('.resizable').resizable('option', 'disabled', true);
  $('.draggable').removeClass('ui-state-disabled');
  $('.draggable .ui-wrapper').removeClass('ui-state-disabled');
}

function doUnlock() {
  locked = false;
  $('.draggable').draggable('option', 'disabled', false);
  $('.resizable').resizable('option', 'disabled', false);
}

function saveConfig() {
  var cameras = [];
  $('.camera').each(function(){
    var cam = {};
    var id = $(this).attr('id');
    cam['id'] = id;
    var p = $(this).position();
    cam['top']    = p.top;
    cam['left']   = p.left;
    cam['width']  = $('#' + id + ' .ui-wrapper').width();
    cam['height'] = $('#' + id + ' .ui-wrapper').height();
    cameras.push(cam);
  });
  
  var size_info = {};
  size_info['sw'] = screen.width;
  size_info['sh'] = screen.height;
  size_info['ww'] = $(window).width();
  size_info['wh'] = $(window).height();
  
  $.post(serverUrl + '/ajax/save' + path,
         {cameras: cameras, size_info: size_info},
         function(data) {
           if (data == 'ok')
             showTimeOutDialog('#alert-save-ok', 3000, '');
           else 
             showTimeOutDialog('#alert-save-error', 3000, data);
         }
  );
}

function showMainMenu() {
  $("#div-main-menu").show();
  $("#div-context-menu").hide();
}

$(function() {
  /*
   * Init draggable and resizable
   */
  $('.draggable').draggable({
    disabled: true,
    snap: true,
    snapMode: "outer",
    snapTolerance: 5,
    stop: function( event, ui ) {
      //saveCamerasCfg();
      selCam = $(this);
      selWrp = $(this).find('.ui-wrapper');
      selImg = $(this).find('img');
    }
  });

  $(".resizable").resizable({
    disabled: true,
    aspectRatio: 320 / 240,
    stop: function( event, ui ) {
      //saveCamerasCfg();
    }
  });
  
  /*
   * Click to select camera, wrapper and image
   */
  $('.draggable').click(function(){
    selCam = $(this);
    selWrp = $(this).find('.ui-wrapper');
    selImg = $(this).find('img');
    //$("#div-context-menu").hide();
  });
  
  /*
   * Context menu
   */
  $('.draggable').bind("contextmenu", function(e) {
    if (locked)
      return;
    e.preventDefault();
    // create and show menu
    //var offset = $(this).offset();
    $("#div-context-menu").show().offset({ top: e.clientY, left: e.clientX });
    //$("#img-context-menu").css('zIndex', 9999);
    //alert(e.clientX - offset.left + ' / ' + e.clientY - offset.top);
    selCam = $(this);
    $("#div-main-menu").hide();
  });
  
  /*
   * Main menu
   */
  $("#div-main-menu").hide();
  $("#main-menu").menu();

  $('#main-menu li').click(function(e) {
    e.preventDefault();
    var id = $(this).attr('id');
    switch(id)
    {
    case 'main-menu-1':       // Lock/Unlock
      var s = $(this).find('a').text();
      //alert('[' + s + ']');
      if (s == 'Lock') {
        $(this).find('a').text('Unlock');
        doLock();
      } else {
        $(this).find('a').text('Lock');
        doUnlock();
      }
      break;
    case 'main-menu-3':       // Save config
      saveConfig();
      break;
    }
    $('#div-main-menu').hide();
  });
  
  /*
   *  Context menu
   */
  $("#div-context-menu").hide();
  $("#img-context-menu").menu();
  

  $(document).click(function(){
    $("#div-context-menu").hide();
    $("#div-main-menu").hide();
  })


  $('#img-context-menu li').click(function(e) {
    e.preventDefault();
    //alert($(this).attr('id'));
    var id = $(this).attr('id');
    switch(id)
    {
    case 'img-menu-1':      // bring to front
      //selCam.css('zIndex', 9999);
      selCam.appendTo('#cameras');
      break;
    case 'img-menu-2':      // send to back
      //selCam.css('zIndex', 1);
      selCam.prependTo('#cameras');
      break;
    //default:
    //  code to be executed if n is different from case 1 and 2
    }    
  });
  
  $(window).keydown(function(event) {
    //$('#down').text(event.which);
    if (event.which == 27) {  // Esc
      $("#div-context-menu").hide();
      $("#div-main-menu").hide();
      return;
    }
    if (event.which == 17) {  // Ctrl - down
      ctrlDown = true;
      return;
    }
    if (event.which == 16) {  // Shift - down
      shftDown = true;
      return;
    }
    if (ctrlDown && event.which == 77) {  // Ctrl+M - show main menu
      showMainMenu();
      return;
    }                                
    if (!locked && selCam) {             // *** Move ***
      if (ctrlDown) {                    
        if (event.which == 37) {         // left
          selCam.css({left: "-=1"});
        } else if (event.which == 38) {  // up
          selCam.css({top: "-=1"});
        } else if (event.which == 39) {  // right
          selCam.css({left: "+=1"});
        } else if (event.which == 40) {  // down
          selCam.css({top: "+=1"});
        }
        if (event.which >= 37 && event.which <= 40)
          saveCamerasCfg();
      }
      if (shftDown) {                // *** Resize - keeping aspectRatio ***
        var w,h,k;
        k = event.which;
        if (k >= 37 && k <= 40) {
          w = selWrp.width();
          h = selWrp.height();
        }
        if (k == 37) {               // hor. reduce
          w--;
          h = w * 240 / 320;
        } else if (k == 38) {        // ver. reduce
          h--;
          w = h * 320 / 240;
        } else if (k == 39) {        // hor. enlarge
          w++;
          h = w * 240 / 320;
        } else if (k == 40) {        // ver. enlarge
          h++;
          w = h * 320 / 240;
        }
        if (k >= 37 && k <= 40)
          selWrp.width(w);
          selWrp.height(h);
          selImg.width(w);
          selImg.height(h);
          saveCamerasCfg();
      }
    }
  });
  
  $(window).keyup(function(event) {
    $('#up').text(event.which);
    if (event.which == 17) {  // Ctrl - up
      ctrlDown = false;  
    }
    if (event.which == 16) {  // Shift - up
      shftDown = false;  
    }
  });
});
