/*jshint browser:true*/
/*global DynamicList */

var goinstant = window.goinstant;
var _ = window._;
var $ = window.$;

var room;

var url = 'https://goinstant.net/mattcreaser/lists';
goinstant.connect(url, function(err, connection, lobby) {
  if (err) {
    console.error('Could not connect', err);
    return;
  }
  room = lobby;
  $(init);
});


function init() {
  var listTmpl = $('#listTemplate').html();

  var lists = new DynamicList({ key: room.key('lists'), template: listTmpl });
  var items;

  $('#lists').on('click', 'li', function(e) {
    var id = $(this).attr('id');
    items = new DynamicList({ key: room.key('items/' + id), template: listTmpl });
    $('#items').append(items.elem);
    $('#items').show();
    $('#lists').hide();
  });

  $('#lists').on('click', '.delete', function(e) {
    e.stopPropagation();
    var li = $(this).closest('li');
    var id = li.attr('id');
    var name = li.find('.name').text();
    if (window.confirm('Delete list ' + name + '?')) {
      lists.remove(id);
      room.key('items/' + id).remove();
    }
  });

  $('#items').on('click', '.delete', function(e) {
    e.stopPropagation();
    var id = $(this).closest('li').attr('id');
    items.remove(id);
  });

  $('#items').swipe({ swipeRight: function() {
    items.destroy();
    $('#lists').show();
    $('#items').hide();
  }});

  $('#lists input').keyup(function(e) {
    if (e.keyCode !== 13) { return; }
    lists.add({ name: $(this).val() });
    $(this).val('');
  });

  $('#items input').keyup(function(e) {
    if (e.keyCode !== 13) { return; }
    items.add({ name: $(this).val(), checked: false });
    $(this).val('');
  });

  $('#lists').append(lists.elem);
}
