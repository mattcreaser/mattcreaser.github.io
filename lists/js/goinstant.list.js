/*jshint browser:true*/
/*global _*/

var DEFAULT_TEMPLATE = '<li>${ name }</li>';

function DynamicList(opts) {
  this.key = opts.key;
  this.template = opts.template || DEFAULT_TEMPLATE;
  this.elem = document.createElement('ul');

  var self = this;

  function add(item, id) {
    var html = _.template(self.template, item);
    var div = document.createElement('div');
    div.innerHTML = html;
    var elem = div.querySelector('li');
    elem.setAttribute('id', id);
    self.elem.appendChild(elem);
  }

  this.key.on('add', { local: true, listener: function(value, context) {
    var id = context.addedKey.substr(context.addedKey.lastIndexOf('/') + 1);
    add(value, id);
  }});

  this.key.on('remove', { local: true, bubble: true, listener: function(value, context) {
    var id = context.key.substr(context.key.lastIndexOf('/') + 1);
    var elem = document.getElementById(id);
    if (elem) elem.parentNode.removeChild(elem);
  }});

  this.key.get(function(err, items) { _.each(items, add); });
}

DynamicList.prototype.destroy = function() {
  if (this.elem.parentNode) this.elem.parentNode.removeChild(this.elem);
  this.key.off();
};

DynamicList.prototype.add = function(item) {
  this.key.add(item);
};

DynamicList.prototype.remove = function(id) {
  this.key.key(id).remove();
};
