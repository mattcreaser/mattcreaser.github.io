/*jshint browser:true*/
/*global console */
'use strict';

var Firebase = window.Firebase;
var _ = window._;
var $ = window.$;

$.mobile.hashListeningEnabled = false;
$.mobile.pushStateEnabled = false;

$(function() {
  $.mobile.loading('show');
  var url = 'https://burning-fire-8069.firebaseio.com/';
  var ref = new Firebase(url);
  listsPage.init(ref);
  itemsPage.init(ref);
});


var listsPage = {
  template: null,
  listview: null,
  ref: null,
  editing: false,

  init: function(baseRef) {
    _.bindAll(this);

    this.template = $('#listTemplate').html();
    this.listview = $('#lists');

    this.ref = baseRef.child('lists');
    this.ref.on('child_added', this.onAdd);
    this.ref.on('child_removed', this.onRemove);

    $('#listsEdit').click(this.startEdit);
    $('#listsDone').click(this.doneEdit);
    $('#listsAddPopup form').submit(this.addList);
  },

  appendList: function(list, id) {
    list.id = id;
    var html = _.template(this.template, { id: id, name: list.name });
    $(html).appendTo(this.listview).find('a')
           .click(_.bind(this.clickHandler, this, list));

  },

  onAdd: function(snapshot) {
    $.mobile.loading('hide');
    var id = snapshot.name();
    var list = snapshot.val();
    this.appendList(list, id);
    this.listview.listview('refresh');
  },

  onRemove: function(snapshot) {
    var id = snapshot.name();
    $('#' + id).remove();
    this.listview.listview('refresh');
  },

  clickHandler: function(list, e) {
    // If in editing mode, delete the list.
    if (this.editing) {
      // Remove the list and all its items.
      this.ref.child(list.id).remove();
      this.ref.parent().child('items').child(list.id).remove();
      this.ref.parent().child('categories').child(list.id).remove();
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
    this.ref.push(list, function() {
      $.mobile.loading('hide');
      $('#listsAddPopup').popup('close');
    });
  }

};

var itemsPage = {
  template: null,
  categoryTemplate: null,
  listview: null,

  baseRef: null,
  ref: null,
  categoryRef: null,

  categories: {},
  items: [],

  init: function(baseRef) {
    _.bindAll(this);

    this.baseRef = baseRef.child('items');
    this.listview = $('#items');
    this.categorySelect = $('#itemsAddCategory');
    this.template = $('#itemTemplate').html();
    this.categoryTemplate = $('#dividerTemplate').html();

    $('#itemsBack').click(this.hide);
    $('#itemsAddPanel form').submit(this.addItem);
    $('#categoriesAddPanel form').submit(this.addCategory);

    $('#itemsAddPanel').on('panelbeforeopen', function() {
      $('#itemsMenuPopup').popup('close');
    });
    $('#categoriesAddPanel').on('panelbeforeopen', function() {
      $('#itemsMenuPopup').popup('close');
    });
  },

  show: function(list) {
    $('#itemsPage [data-role=header] h2').text(list.name);
    this.ref = this.baseRef.child(list.id);
    this.categoryRef = this.baseRef.parent().child('categories/' + list.id);

    this.categoryRef.on('child_added', this.onCategoryAdd);
    this.categoryRef.on('child_removed', this.onCategoryRemove);

    this.ref.on('child_added', this.onItemAdd);
    this.ref.on('child_removed', this.onItemRemove);

    this.categories = [];
    this.items = [];
  },

  hide: function() {
    this.ref.off();
    this.categoryRef.off();

    this.categorySelect.empty();
    this.categorySelect.selectmenu('refresh');

    this.listview.empty();
    this.listview.listview('refresh');

    $('body').pagecontainer('change', '#listsPage');
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

  appendCategory: function(category, id) {
    this.categories[id] = category;
    $('<option></option>').attr('id', id).val(category.name)
                  .text(category.name).appendTo(this.categorySelect);
    this.categorySelect.selectmenu('refresh');
  },

  onItemAdd: function(snapshot) {
    var id = snapshot.name();
    var item = snapshot.val();
    this.appendItem(item, id);
    this.listview.listview('refresh');
  },

  onItemRemove: function(snapshot) {
    var id = snapshot.name();
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

  onCategoryAdd: function(snapshot) {
    var id = snapshot.name();
    var category = snapshot.val();
    this.appendCategory(category, id);
  },

  onCategoryRemove: function(snapshot) {
    var id = snapshot.name();
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

    // Add it to Firebase. Show the spinner while adding.
    $.mobile.loading('show');
    this.ref.push(item, function() {
      $.mobile.loading('hide');
      $('#itemsAddPanel').panel('close');
    });
  },

  addCategory: function(e) {
    e.preventDefault();

    var category = {
      name: $('#categoriesAddName').val()
    };

    // Clear the form input for the next addition.
    $('#categoriesAddName').val('');

    // Add it to Firebase. Show the spinner while adding.
    $.mobile.loading('show');
    this.categoryRef.push(category, function() {
      $.mobile.loading('hide');
      $('#categoriesAddPanel').panel('close');
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
      self.ref.child(id).remove(function() {
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
