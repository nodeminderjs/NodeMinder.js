// Copyright NodeMinder.js
//
function formatDateTime(dt, fmt) {
  if ((typeof dt) == 'string') {
    fmt = dt;
    dt = null;
  }
  
  if (dt == null) {
    dt = new Date();
  }
  
  var h  = dt.getHours().toString(),
      n  = dt.getMinutes().toString(),
      s  = dt.getSeconds().toString(),
      hh = (h.length == 1 ? '0'+h : h),
      nn = (n.length == 1 ? '0'+n : n),
      ss = (s.length == 1 ? '0'+s : s);

  if (fmt == null || fmt == 'hh:mm:ss' ) {
    return hh + ':' + nn + ':' + ss;
  }

  var d  = dt.getDate().toString(),
      m  = (dt.getMonth() + 1).toString(),
      y  = dt.getFullYear().toString(),
      dd = (d.length == 1 ? '0'+d : d),
      mm = (m.length == 1 ? '0'+m : m),
      yy = y.substr(2,2);
  
  fmt = fmt.replace('dd', dd);
  fmt = fmt.replace('mm', mm);
  fmt = fmt.replace('yy', yy);
  fmt = fmt.replace('d', d);
  fmt = fmt.replace('m', m);
  fmt = fmt.replace('y', y);
  fmt = fmt.replace('hh', hh);
  fmt = fmt.replace('nn', nn);
  fmt = fmt.replace('ss', ss);
  fmt = fmt.replace('h', h);
  fmt = fmt.replace('n', n);
  fmt = fmt.replace('s', s);

  return fmt;
}

exports.formatDateTime = formatDateTime;
