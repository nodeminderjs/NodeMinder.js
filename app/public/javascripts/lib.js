function showTimeOutDialog(div_selector, ms, msg) {
  $('.alert-msg').text(msg);
  $(div_selector).show();
  setTimeout( function () {
    $(div_selector).hide();
  }, ms); // milliseconds delay
}
