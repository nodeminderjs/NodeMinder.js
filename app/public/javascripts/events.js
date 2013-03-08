var hour = '00';

$(function() {
  $("#hour a").click(function(e) {
    e.preventDefault();
    //alert('[' + $(this).text() + ']');
    $('#hour a').removeClass('hsel');
    $(this).addClass('hsel');
    hour = $(this).text();
    updateList();
  });
  
  $( "#datepicker" ).datepicker({
    dateFormat: 'yy-mm-dd',
    defaultDate: 0
  });

  var d = new Date();
  $( "#datepicker" ).datepicker( "setDate", d );
  
  $('#datepicker').change(function(){
    hour = '00';
    updateList();
  });
  
  updateList();

});

function updateList() {
  var d = $( "#datepicker" ).datepicker( "getDate" ).toISOString().substr(0,10);
  var u = window.location.protocol + '//' + window.location.host +
          '/ajax/videos/' + cameras[0] + '/' + d + '/' + hour;
  $.getJSON(u, function(data) {
    $('ul').html('');

    var items = [];
    var s, l;
    $.each(data, function(i) {
      s = data[i];
      l = s.length;
      if (s.substr(l-4,4) == '.mp4') {
        items.push('<li>' + s.substr(0,2)+':'+s.substr(2,2)+':'+s.substr(4,2) + '</li>');
      }
    });
     
    $('ul').html(items.join(''));
    
    $('li').click(function() {
      $('li.selected').removeClass('selected');
      $(this).addClass('selected');
      var h = $(this).text(); // 10:18:54
      var f = window.location.protocol + '//' + window.location.host +
              '/video/' + cameras[0] + '/' + d + '/' + 
              h.substr(0,2) + h.substr(3,2) + h.substr(6,2);
      var htmlStr = '<video width="320" height="240" controls autoplay>' +
                    '<source src="' + f + '" type="video/mp4">' +
                    'Your browser does not support the video tag.' +
                    '</video>';
      $('#video').html(htmlStr);

    });  
  });
}
