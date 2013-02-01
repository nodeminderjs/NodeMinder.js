$(function() {
  $( "#datepicker" ).datepicker({
    dateFormat: 'yy-mm-dd',
    defaultDate: 0
  });

  var d = new Date();
  $( "#datepicker" ).datepicker( "setDate", d );
  
  $('#datepicker').change(updateList);
  
  updateList();

});

function updateList() {
  var d = $( "#datepicker" ).datepicker( "getDate" ).toISOString().substr(0,10);
  var u = window.location.protocol + '//' + window.location.host +
          '/ajax/videos/' + cameras[0] + '/' + d;
  $.getJSON(u, function(data) {
    $('ul').html('');

    var items = [];
    var s, l;
    $.each(data, function(i) {
      s = data[i];
      l = s.length;
      if (s.substr(l-4,4) == '.mp4') {
        items.push('<li>' + s.substr(0,6) + '</li>');
      }
    });
     
    $('ul').html(items.join(''));
    
    $('li').click(function() {
      $('li.selected').removeClass('selected');
      $(this).addClass('selected');
      var f = window.location.protocol + '//' + window.location.host +
              '/video/' + cameras[0] + '/' + d + '/' + $(this).text();
      var htmlStr = '<video width="320" height="240" controls autoplay>' +
                    '<source src="' + f + '" type="video/mp4">' +
                    'Your browser does not support the video tag.' +
                    '</video>';
      $('#video').html(htmlStr);

    });  
  });
}
