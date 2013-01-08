/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'NodeMinder.js' });
};

exports.grid = function(req, res){
  res.render('grid', { title: 'NodeMinder.js Grid' });
};

