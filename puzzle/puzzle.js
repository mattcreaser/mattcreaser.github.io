var board = {

  init: function() {
    var table = $('#board');

    for (var i = 0; i < 8; ++i) {
      var row = $('<tr>').appendTo(table);
      for (var j = 0; j < 8; ++j) {
        var index = i * 8 + j;

        var cell = $('<td>').appendTo(row);
        cell.text(index).attr('id', 'cell' + index);

        var isBlack = (j - (i % 2)) % 2;
        cell.addClass(isBlack ? 'black' : 'white');
      }
    }
  },

  randomize: function () {
    $('#board td').each(function() {
      var cell = $(this);
      if (Math.random() < 0.5) {
        cell.addClass('heads');
      } else {
        cell.removeClass('heads');
      }
    });
  },

  getParity: function() {
    var parity = [];
    var cells = $('#board td');

    for (var i = 0; i < 6; ++i) {
      var group = this.getGroup(i);
      parity[i] = false;
      group.each(function() {
        var heads = $(this).hasClass('heads');
        parity[i] = parity[i] ? !heads : heads;
      });
    }

    return parity;
  },

  getGroup: function(groupNumber) {
    return $('#board td').filter(function(i) {
      return (i & 1 << (5 - groupNumber)) !== 0;
    });
  }

};

var walkthrough = {

  parity: 0,
  target: 0,
  toFlip: 0,

  init: function() {
    $('#resetButton').click(this.reset.bind(this));
    $('#parityBinary span').hover(this.displayGroup.bind(this));
    this.reset();
  },

  reset: function() {
    board.randomize();
    this.updateParity();
    $('#board td').off('click');
    $('.target').removeClass('target');
    $('.toFlip').removeClass('toFlip');
    this.showStep1();
  },

  updateParity: function() {
    var parity = board.getParity();
    var decimalParity = 0;
    for (var i = 0; i < 6; ++i) {
      $('#parity' + i).text(parity[i] ? '1' : '0');
      decimalParity = decimalParity | parity[i] << (5 - i);
    }
    this.parity = decimalParity;
    $('#decimalParity').text(decimalParity);
  },

  displayGroup: function(event) {
    var groupNum = parseInt(event.target.id[6]);
    var group = board.getGroup(groupNum);

    if (event.type == 'mouseleave') {
      $('#board td').removeClass('hideCell');
      return;
    }

    $('#board td').addClass('hideCell');

    group.each(function() {
      $(this).removeClass('hideCell');
    });
  },

  showStep1: function() {
    $('#step1').show();
    $('#step2').hide();

    $('#board td').click(this.setTarget.bind(this));
  },

  setTarget: function(event) {
    this.target = parseInt(event.target.id.substring(4));
    $('#targetDecimal').text(this.target);
    $('#targetBinary').text(this.padBinary(this.target.toString(2)));

    $('#board td').off('click');

    $('#step1').hide();
    $('#step2').show();

    $(event.target).addClass('target');

    this.toFlip = this.target ^ this.parity;
    $('#toFlipDecimal').text(this.toFlip);
    $('#toFlipBinary').text(this.padBinary(this.toFlip.toString(2)));
    $('#cell' + this.toFlip).addClass('toFlip');

    $('.toFlip').click(this.flip.bind(this));
  },

  flip: function(event) {
    $(event.target).toggleClass('heads');
    this.updateParity();
  },

  padBinary: function(binary) {
    while (binary.length < 6) {
      binary = '0' + binary;
    }
    return binary;
  }

};


$(function() {
  board.init();
  walkthrough.init();
});
