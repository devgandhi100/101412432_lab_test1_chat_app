const socket = io('http://localhost:3000'); // Replace with your backend URL
let username = localStorage.getItem('username');
let room;

if (!username) {
  alert('Please log in first');
  window.location.href = 'login.html';
}

$('#joinRoomBtn').on('click', function () {
  room = $('#roomSelect').val();
  if (room) {
    socket.emit('joinRoom', { username, room });
    $('#chatWindow').show();
    $('#leaveRoomBtn').show();
    $('#joinRoomBtn').hide();
    $('#messageInput').focus();
  }
});

$('#leaveRoomBtn').on('click', function () {
  if (room) {
    socket.emit('leaveRoom', { username, room });
    $('#messages').empty();
    $('#chatWindow').hide();
    $('#leaveRoomBtn').hide();
    $('#joinRoomBtn').show();
  }
});

$('#messageForm').on('submit', function (e) {
  e.preventDefault();
  const message = $('#messageInput').val();
  if (message && room) {
    socket.emit('sendMessage', { message });
    $('#messageInput').val('');
  }
});

$('#messageInput').on('input', function () {
  if (room) {
    socket.emit('typing', $('#messageInput').val().length > 0);
  }
});

socket.on('message', (data) => {
  const messageClass = data.user === username ? 'sent' : 'received';
  $('#messages').append(`<p class="message ${messageClass}"><strong>${data.user}:</strong> ${data.message}</p>`);
  $('#chatWindow').scrollTop($('#chatWindow')[0].scrollHeight);
});

// Handle typing events
socket.on('typing', (data) => {
  if (data.isTyping) {
    $('#typingUser').text(data.user);
    $('#typingIndicator').show(); // Show typing indicator
  } else {
    $('#typingIndicator').hide(); // Hide typing indicator
  }
});

// Trigger typing event on input
$('#messageInput').on('input', function () {
  if (room) {
    const isTyping = $('#messageInput').val().length > 0;
    socket.emit('typing', isTyping); // Emit typing status (true or false)
  }
});

// Hide typing indicator when the input is empty
$('#messageInput').on('blur', function () {
  if (room && $('#messageInput').val().length === 0) {
    socket.emit('typing', false); // Emit typing status as false
  }
});

$('#logoutBtn').on('click', function () {
  localStorage.removeItem('username');
  window.location.href = 'login.html';
});