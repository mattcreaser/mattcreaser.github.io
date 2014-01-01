/*jshint browser:true*/
/*global DynamicList */

var goinstant = window.goinstant;
var _ = window._;
var $ = window.$;

$.mobile.hashListeningEnabled = false;
$.mobile.pushStateEnabled = false;

$(function() {
  $.mobile.loading('show');
  var url = 'https://goinstant.net/mattcreaser/lists';
  goinstant.connect(url, function(err, connection, lobby) {
    if (err) { return console.error('Could not connect', err); }
    listsPage.init(lobby);
    itemsPage.init(lobby);
  });
});


var listsPage = {
  template: null,
  listview: null,
  key: null,

  init: function(room) {
    _.bindAll(this, 'populate', 'appendList');

    this.template = $('#listTemplate').html();
    this.listview = $('#lists');

    this.key = room.key('lists');
    this.key.get(this.populate);
  },

  populate: function(err, lists) {
    if (err) { return console.error(err); }
    $.mobile.loading('hide');

    _.each(lists, this.appendList);
    this.listview.listview('refresh');
  },

  appendList: function(list, id) {
    var html = _.template(this.template, list);
    $(html).appendTo(this.listview).find('a')
           .click(function() { itemsPage.show(id); });

  }

};

var itemsPage = {
  template: null,
  categoryTemplate: null,
  listview: null,
  key: null,
  categories: [],
  items: [],

  init: function(room) {
    _.bindAll(this);

    this.key = room.key('items');
    this.listview = $('#items');
    this.template = $('#itemTemplate').html();
    this.categoryTemplate = $('#dividerTemplate').html();

    $('#itemsBack').click(this.hide);
    $('#itemsAddPopup form').submit(this.addItem);
  },

  show: function(id) {
    this.key = this.key.room().key('items/' + id);
    this.key.get(this.populate);
    this.key.on('add', { local: true, listener: this.onAdd });
    this.key.on('remove', { bubble: true, local: true, listener: this.onRemove });
    this.categories = [];
    this.items = [];
  },

  hide: function() {
    this.key.off();
    $('body').pagecontainer('change', '#listsPage');
  },

  populate: function(err, items) {
    if (err) { return console.error(err); }
    this.listview.empty();
    _.each(items, this.appendItem);
    this.listview.listview('refresh');
  },

  appendItem: function(item, id) {
    // Store the id in the item so that we can find its element later.
    item.id = id;

    var index = _.sortedIndex(this.items, item, 'category');
    var html = _.template(this.template, { id: id, name: item.name });

    // Add a category header if necessary.
    var category = $('#' + this.toId(item.category));
    if (category.size() === 0) {
      var vars = { id: this.toId(item.category), category: item.category };
      html = _.template(this.categoryTemplate, vars) + html;
      this.categories.push(item.category);
    }

    // Figure out where to insert the new html.
    var after = this.items[index - 1];
    var before = this.items[index];

    var toInsert = $(html);
    toInsert.find('.delete').click(this.removeItem);

    if (before && before.category === item.category) {
      toInsert.insertBefore('#' + before.id);
    } else if (after) {
      toInsert.insertAfter('#' + after.id);
    } else {
      toInsert.appendTo(this.listview);
    }

    this.items.splice(index, 0, item);
  },

  onAdd: function(item, context) {
    var id = context.addedKey.substr(context.addedKey.lastIndexOf('/') + 1);
    this.appendItem(item, id);
    this.listview.listview('refresh');
  },

  onRemove: function(value, context) {
    var id = context.key.substr(context.key.lastIndexOf('/') + 1);
    var li = $('#' + id);

    // Remove the item from our cached list.
    var index = _.findIndex(this.items, { id: id });
    this.items.splice(index, 1);

    // Remove empty categories.
    if (li.prev().attr('data-role') === 'list-divider' &&
        (li.next().size() === 0 ||
         li.next().attr('data-role') === 'list-divider')) {
      li.prev().remove();
    }

    // Remove the item from the view.
    li.remove();
    this.listview.listview('refresh');
  },

  addItem: function(e) {
    e.preventDefault();

    // Create the item.
    var item = {
      name: $('#itemsAddName').val(),
      category: $('#itemsAddCategory').val() || "Uncategorized"
    };

    // Clear the form inputs for the next addition.
    $('#itemsAddName').val('');
    $('#itemsAddCategory').val('');

    // Add it to GoInstant. Show the spinner while adding.
    $.mobile.loading('show');
    this.key.add(item, function() {
      $.mobile.loading('hide');
      $('#itemsAddPopup').popup('close');
    });
  },

  removeItem: function(e) {
    e.preventDefault();

    // Find the id of the remove item.
    var id = $(e.target).closest('li').attr('id');

    // Remove it from GoInstant. Show the spinner while removing.
    $.mobile.loading('show');
    this.key.key(id).remove(function() { $.mobile.loading('hide'); });
  },

  toId: function(category) {
    return category.replace(/\s/g, '');
  }

};

