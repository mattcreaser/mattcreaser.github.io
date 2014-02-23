/*jshint browser:true*/
/*global console */
'use strict';

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
  editing: false,

  init: function(room) {
    _.bindAll(this);

    this.template = $('#listTemplate').html();
    this.listview = $('#lists');

    this.key = room.key('lists');
    this.key.get(this.populate);
    this.key.on('add', { local: true }, this.onAdd);
    this.key.on('remove', { local: true, bubble: true }, this.onRemove);

    $('#listsEdit').click(this.startEdit);
    $('#listsDone').click(this.doneEdit);
    $('#listsAddPopup form').submit(this.addList);
  },

  populate: function(err, lists) {
    if (err) { return console.error(err); }
    $.mobile.loading('hide');

    _.each(lists, this.appendList);
    this.listview.listview('refresh');
  },

  appendList: function(list, id) {
    list.id = id;
    var html = _.template(this.template, { id: id, name: list.name });
    $(html).appendTo(this.listview).find('a')
           .click(_.bind(this.clickHandler, this, list));

  },

  onAdd: function(list, context) {
    var id = context.addedKey.substr(context.addedKey.lastIndexOf('/') + 1);
    this.appendList(list, id);
    this.listview.listview('refresh');
  },

  onRemove: function(value, context) {
    var id = context.key.substr(context.key.lastIndexOf('/') + 1);
    $('#' + id).remove();
    this.listview.listview('refresh');
  },

  clickHandler: function(list, e) {
    // If in editing mode, delete the list.
    if (this.editing) {
      // Remove the list and all its items.
      this.key.key(list.id).remove();
      this.key.room().key('items').key(list.id).remove();
      return e.preventDefault();
    }

    // Not editing, switch to the items page for this list.
    itemsPage.show(list);
  },

  startEdit: function(e) {
    e.preventDefault();
    this.editing = true;

    $('#listsPage').addClass('editing');
    this.listview.listview('option', 'icon', 'delete').find('a')
    .removeClass('ui-icon-carat-r').addClass('ui-icon-delete');
    $('#listsEdit').hide();
    $('#listsAdd').hide();
    $('#listsDone').show();
  },

  doneEdit: function(e) {
    e.preventDefault();
    this.editing = false;

    $('#listsPage').removeClass('editing');
    this.listview.listview('option', 'icon', 'carat-r').find('a')
    .removeClass('ui-icon-delete').addClass('ui-icon-carat-r');
    $('#listsEdit').show();
    $('#listsAdd').show();
    $('#listsDone').hide();
  },

  addList: function(e) {
    e.preventDefault();

    var list = {
      name: $('#listsAddName').val()
    };

    $('#listsAddName').val('');

    $.mobile.loading('show');
    this.key.add(list, function() {
      $.mobile.loading('hide');
      $('#listsAddPopup').popup('close');
    });
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

  show: function(list) {
    $('#itemsPage [data-role=header] h2').text(list.name);
    this.key = this.key.room().key('items/' + list.id);
    this.key.get(this.populate);
    this.key.on('add', { local: true }, this.onAdd);
    this.key.on('remove', { bubble: true, local: true }, this.onRemove);
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

    item.category = item.category || 'Uncategorized';

    var index = _.sortedIndex(this.items, item, 'category');
    var html = _.template(this.template, { id: id, name: item.name });

    // Add a category header if necessary.
    var categoryId = this.toId(item.category);
    if (!_.find(this.categories, { id: categoryId })) {
      var vars = { id: categoryId, category: item.category };
      html = _.template(this.categoryTemplate, vars) + html;
      this.categories.push(vars);
    }

    // Figure out where to insert the new html.
    var after = this.items[index - 1];
    var before = this.items[index];

    var toInsert = $(html);
    toInsert.find('a').click(this.promptForRemoval);

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
      var categoryId = li.prev().attr('id');
      li.prev().remove();
      this.categories = _.reject(this.categories, { id: categoryId });
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
      category: $('#itemsAddCategory').val()
    };

    // Clear the form inputs for the next addition.
    $('#itemsAddName').val('');

    // Add it to GoInstant. Show the spinner while adding.
    $.mobile.loading('show');
    this.key.add(item).then(function() {
      $.mobile.loading('hide');
      $('#itemsAddPopup').popup('close');
    });
  },

  promptForRemoval: function(e) {
    e.preventDefault();

    // Replace the click handler
    var id = $(e.target).closest('li').attr('id');
    var self = this;
    $('#itemsRemoveSubmit').off('click').on('click', function(e) {
      e.preventDefault();
      $.mobile.loading('show');
      self.key.key(id).remove().then(function() {
        $.mobile.loading('hide');
        $('#itemsRemoveConfirm').popup('close');
      });
    });

    // Set the name in the confirmation popup.
    var item = _.find(this.items, { id: id });
    $('#itemsRemoveName').text(item.name);

    // Open the confirm popup
    $('#itemsRemoveConfirm').popup('open');
  },

  toId: function(category) {
    return category.replace(/[^A-Za-z0-9\-\._:]/g, '.');
  }

};

var categoryPage = {

};
