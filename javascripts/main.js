/* jshint browser:true */
/* global goinstant, getUserMedia, console, URL, $ */
/* global RTCPeerConnection, _ */

'use strict';

/* Dependencies */

var displayName = sessionStorage.getItem('displayName');
if (!displayName) {
  displayName = window.prompt('Who dat?', 'Guest');
  sessionStorage.setItem('displayName', displayName);
}

var url = 'https://goinstant.net/mattcreaser/GoGlass';
getUserMedia({ onsuccess: function(stream) {

  var opts = {
    user: { displayName: displayName }
  };

  var src = URL.createObjectURL(stream);
  $('#localStream video').attr('src', src).get(0).volume = 0;
  $('#localStream div').text(displayName);
  $('#localStream').show();

  goinstant.connect(url, opts, function (err, connection, lobby) {
    if (err) {
      console.log('Error connecting to platform:', err);
      return;
    }

    // Leave the lobby when leaving the page.
    window.onbeforeunload = function() { lobby.leave(); };

    function addChatMsg(msg, uid) {
      var text = users[uid] + ': ' + msg;
      $('<div></div>').addClass('chatMsg')
        .text(text)
        .appendTo('#messages');
    }

    var chatChannel = lobby.channel('chat');
    chatChannel.on('message', function(data, context) {
      addChatMsg(data, context.userId);
    });

    $('#chat input').keypress(function(evt) {
      if (evt.keyCode === 13) {
        var msg = $(this).val();
        $(this).val('');
        chatChannel.message(msg);
        addChatMsg(msg, id);
      }
    });

    var id = connection._user.id;
    var peers = {};
    var users = {};

    lobby.users.get(function(err, res) {
      if (err) {
        console.error('Could not fetch users', err);
        return;
      }
      _.each(res, function(u, id) {
        users[id] = u.displayName;
      });
    });

    function onOffer(data, userId) {
      console.log('Received an offer from', userId);

      var configuration = {
        attachStream: stream,
        offerSDP: data.offerSDP,
        onRemoteStream: _.partial(onRemoteStream, userId),
        onRemoteStreamEnded: _.partial(onRemoteStreamEnded, userId),
        onAnswerSDP: function(answerSDP) {
          console.log('Sending answer sdp to', userId);
          lobby.channel(userId).message({ answerSDP: answerSDP });
        },
        onICE: function(iceCandidate) {
          console.log('Sending ice candidate to', userId);
          lobby.channel(userId).message({ iceCandidate: iceCandidate });
        }
      };

      peers[userId] = new RTCPeerConnection(configuration);
    }

    function onAnswer(data, userId) {
      console.log('Received an answer from', userId);
      peers[userId].addAnswerSDP(data.answerSDP);
    }

    function onIce(data, userId) {
      console.log('Received ICE candidate from', userId);
      peers[userId].addICE(data.iceCandidate);
    }

    function sendOffer(user) {
      console.log('Creating offer for', user.id);

      var configuration = {
        attachStream: stream,
        onRemoteStream: _.partial(onRemoteStream, user.id),
        onRemoteStreamEnded: _.partial(onRemoteStreamEnded, user.id),
        onOfferSDP: function(offerSDP) {
          console.log('Sending offer to', user.id);
          lobby.channel(user.id).message({ offerSDP: offerSDP });
        },
        onICE: function(iceCandidate) {
          console.log('Sending ICE candidate to', user.id);
          lobby.channel(user.id).message({ iceCandidate: iceCandidate });
        }
      };

      peers[user.id] = new RTCPeerConnection(configuration);
    }

    // Handle offers and answers sent from other users.
    var channel = lobby.channel(id);
    channel.on('message', function(data, context) {
      console.log('Received message', data);
      if (data.offerSDP) {
        return onOffer(data, context.userId);
      } else if (data.answerSDP) {
        return onAnswer(data, context.userId);
      } else if (data.iceCandidate) {
        return onIce(data, context.userId);
      }
    });

    // Send an offer to any user that joins after me.
    lobby.on('join', function(user) {
      users[user.id] = user.displayName;

      // Wait a couple seconds before sending an offer to
      // make sure they have the listener setup
      setTimeout(function() {
        sendOffer(user);
      }, 2000);
    });
    lobby.on('leave', function(user) {
      $('#' + user.id.replace(':', '\\:')).remove();
      if ($('video').size() === 0) {
        $('#wait').show();
      }
      delete peers[user.id];
    });

    function onRemoteStream(id, stream) {
      lobby.user(id).get(function(err, user) {
        if (err) {
          console.error('Could not get user', err);
          return;
        }

        var src = URL.createObjectURL(stream);

        var wrapper = $('<div></div>')
          .attr('id', id)
          .addClass('wrapper')
          .appendTo(document.querySelector('#camContainers'));

        $('<video></video>')
          .attr('src', src)
          .attr('autoplay', 'autoplay')
          .appendTo(wrapper);

        var link = $('<a></a>').text('Freeze').click(function() {
          var canvas = document.querySelector('#sharedBoard');
          var context = canvas.getContext('2d');

          var video = $(this).parent().prev()[0];
          var w = video.videoWidth;
          var h = video.videoHeight;

          canvas.width = w;
          canvas.height = h;

          console.log(w, h);
          context.fillRect(0, 0, w, h);
          context.drawImage(video, 0, 0, w, h);
        });

        var nameDiv = $('<div></div>').text(user.displayName).append(link);
        wrapper.append(nameDiv);

        $('#wait').hide();
      });
    }
  });
}});

function screenShotCam(id) {
  console.log(id);
}

function onRemoteStreamEnded(id) {
  $('#' + id.replace(':', '\\:')).remove();

  if ($('video').size() === 0) {
    $('#wait').show();
  }
}
